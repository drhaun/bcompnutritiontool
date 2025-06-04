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
def load_fitomics_recipes():
    try:
        with open('data/fitomics_recipes.json', 'r') as f:
            recipes = json.load(f)
            # Debug: Show recipe count
            st.write(f"Debug: Loaded {len(recipes)} recipes from database")
            return recipes
    except FileNotFoundError:
        st.error("Recipe database not found. Please contact support.")
        return []
    except Exception as e:
        st.error(f"Error loading recipes: {str(e)}")
        return []

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

# Check if nutrition targets are properly calculated
has_valid_nutrition = False
if 'nutrition_plan' in st.session_state:
    nutrition_plan = st.session_state.nutrition_plan
    target_calories = nutrition_plan.get('target_calories')
    if target_calories and not (isinstance(target_calories, float) and math.isnan(target_calories)):
        has_valid_nutrition = True

if not has_valid_nutrition:
    st.warning("Your nutrition targets haven't been calculated yet. Please complete the Nutrition Targets tab in Weekly Schedule and Nutrition first.")
    
    # Provide quick calculation option
    if st.button("Calculate My Nutrition Targets Now"):
        user_info = st.session_state.user_info
        goal_info = st.session_state.goal_info
        
        try:
            tdee = utils.calculate_tdee(
                user_info['gender'],
                user_info['weight_kg'],
                user_info['height_cm'],
                user_info['age'],
                user_info['activity_level']
            )
            
            target_calories = utils.calculate_target_calories(tdee, goal_info.get('goal_type', 'maintain'))
            macros = utils.calculate_macros(target_calories, user_info['weight_kg'], goal_info.get('goal_type', 'maintain'))
            
            st.session_state.nutrition_plan.update({
                'target_calories': target_calories,
                'target_protein': macros['protein'],
                'target_carbs': macros['carbs'],
                'target_fat': macros['fat']
            })
            
            st.success("Nutrition targets calculated successfully!")
            st.rerun()
            
        except Exception as e:
            st.error("Unable to calculate nutrition targets. Please complete all setup steps first.")
    
    st.stop()

# Get user preferences and targets
diet_prefs = st.session_state.diet_preferences
nutrition_plan = st.session_state.nutrition_plan

# Safely get nutrition targets
def safe_value(value, default):
    try:
        if value is None or (isinstance(value, float) and math.isnan(value)):
            return default
        return float(value)
    except (TypeError, ValueError):
        return default

target_calories = int(safe_value(nutrition_plan.get('target_calories', 2000), 2000))
target_protein = int(safe_value(nutrition_plan.get('target_protein', 150), 150))
target_carbs = int(safe_value(nutrition_plan.get('target_carbs', 200), 200))
target_fat = int(safe_value(nutrition_plan.get('target_fat', 70), 70))

# Display nutrition targets
st.subheader("📊 Your Daily Nutrition Targets")
target_cols = st.columns(4)
with target_cols[0]:
    st.metric("Calories", f"{target_calories}")
with target_cols[1]:
    st.metric("Protein", f"{target_protein}g")
with target_cols[2]:
    st.metric("Carbs", f"{target_carbs}g")
with target_cols[3]:
    st.metric("Fat", f"{target_fat}g")

st.markdown("---")

# Load recipes
recipes = load_fitomics_recipes()
if not recipes:
    st.error("No recipes available. Please contact support.")
    st.stop()

# Debug: Show first few recipe titles
st.write("Debug: Sample recipe titles:", [r['title'] for r in recipes[:5]])

# Get user preferences
dietary_restrictions = diet_prefs.get('dietary_restrictions', [])
meal_frequency = diet_prefs.get('meal_frequency', 3)

# Filter recipes by dietary restrictions
def filter_recipes_by_restrictions(recipes, restrictions):
    filtered = []
    for recipe in recipes:
        include = True
        
        # Check dietary restrictions against tags and ingredients
        if 'Vegetarian' in restrictions:
            meat_keywords = ['chicken', 'beef', 'turkey', 'salmon', 'tuna', 'cod', 'fish', 'meat']
            if any(keyword in recipe['title'].lower() or 
                   any(keyword in ing.lower() for ing in recipe.get('ingredients', [])) 
                   for keyword in meat_keywords):
                include = False
        
        if 'Vegan' in restrictions:
            animal_keywords = ['chicken', 'beef', 'turkey', 'salmon', 'tuna', 'cod', 'fish', 'meat', 
                              'egg', 'cheese', 'yogurt', 'milk', 'butter', 'cream']
            if any(keyword in recipe['title'].lower() or 
                   any(keyword in ing.lower() for ing in recipe.get('ingredients', [])) 
                   for keyword in animal_keywords):
                include = False
        
        if 'Gluten-Free' in restrictions:
            if not any('#glutenfree' in tag for tag in recipe.get('tags', [])):
                include = False
        
        if 'Dairy-Free' in restrictions:
            if not any('#dairyfree' in tag for tag in recipe.get('tags', [])):
                include = False
        
        if include:
            filtered.append(recipe)
    
    return filtered

# Filter recipes
available_recipes = filter_recipes_by_restrictions(recipes, dietary_restrictions)

# Categorize recipes
recipe_categories = {
    'breakfast': [r for r in available_recipes if r['category'] == 'breakfast'],
    'lunch': [r for r in available_recipes if r['category'] == 'lunch'],
    'dinner': [r for r in available_recipes if r['category'] == 'dinner'],
    'snack': [r for r in available_recipes if r['category'] == 'snack'],
    'dessert': [r for r in available_recipes if r['category'] == 'dessert']
}

# Recipe selection interface
st.subheader("🍽️ Select Your Preferred Recipes")

col1, col2 = st.columns(2)

with col1:
    st.markdown("**Breakfast Options:**")
    selected_breakfast = st.multiselect(
        "Choose breakfast recipes",
        options=[r['title'] for r in recipe_categories['breakfast']],
        default=[r['title'] for r in recipe_categories['breakfast'][:2]],
        key="breakfast_selection"
    )
    
    st.markdown("**Lunch Options:**")
    selected_lunch = st.multiselect(
        "Choose lunch recipes",
        options=[r['title'] for r in recipe_categories['lunch']],
        default=[r['title'] for r in recipe_categories['lunch'][:2]],
        key="lunch_selection"
    )

with col2:
    st.markdown("**Dinner Options:**")
    selected_dinner = st.multiselect(
        "Choose dinner recipes",
        options=[r['title'] for r in recipe_categories['dinner']],
        default=[r['title'] for r in recipe_categories['dinner'][:3]],
        key="dinner_selection"
    )
    
    st.markdown("**Snack Options:**")
    selected_snacks = st.multiselect(
        "Choose snack recipes",
        options=[r['title'] for r in recipe_categories['snack']],
        default=[r['title'] for r in recipe_categories['snack'][:2]],
        key="snack_selection"
    )

# Date selector
st.markdown("---")
selected_date = st.date_input("Plan meals for:", value=date.today())
date_key = selected_date.isoformat()

# Meal structure based on frequency
def get_meal_structure(frequency):
    if frequency == 2:
        return {"Breakfast": 0.4, "Dinner": 0.6}
    elif frequency == 3:
        return {"Breakfast": 0.25, "Lunch": 0.40, "Dinner": 0.35}
    elif frequency == 4:
        return {"Breakfast": 0.25, "Lunch": 0.35, "Snack": 0.15, "Dinner": 0.25}
    elif frequency == 5:
        return {"Breakfast": 0.20, "Morning Snack": 0.15, "Lunch": 0.30, "Afternoon Snack": 0.15, "Dinner": 0.20}
    else:
        return {"Breakfast": 0.25, "Lunch": 0.40, "Dinner": 0.35}

meal_structure = get_meal_structure(meal_frequency)

# Initialize meal plan storage
if 'ai_meal_plans' not in st.session_state:
    st.session_state.ai_meal_plans = {}

if date_key not in st.session_state.ai_meal_plans:
    st.session_state.ai_meal_plans[date_key] = {}

# Function to find recipe by title
def find_recipe_by_title(title, recipes):
    for recipe in recipes:
        if recipe['title'] == title:
            return recipe
    return None

# Function to calculate portion multiplier for target calories
def calculate_portion_multiplier(recipe, target_calories):
    if not recipe.get('nutrition') or recipe['nutrition'].get('calories', 0) == 0:
        return 1.0
    
    recipe_calories = recipe['nutrition']['calories']
    multiplier = target_calories / recipe_calories
    return max(0.25, min(3.0, multiplier))  # Keep reasonable portion sizes

# Function to create meal plan with selected recipes
def create_fitomics_meal_plan(meal_structure, selected_recipes):
    meal_plan = {}
    
    for meal_name, calorie_percentage in meal_structure.items():
        target_meal_calories = int(target_calories * calorie_percentage)
        
        # Select appropriate recipes based on meal type
        if "breakfast" in meal_name.lower():
            available = [find_recipe_by_title(title, available_recipes) 
                        for title in selected_breakfast if find_recipe_by_title(title, available_recipes)]
        elif "lunch" in meal_name.lower():
            available = [find_recipe_by_title(title, available_recipes) 
                        for title in selected_lunch if find_recipe_by_title(title, available_recipes)]
        elif "dinner" in meal_name.lower():
            available = [find_recipe_by_title(title, available_recipes) 
                        for title in selected_dinner if find_recipe_by_title(title, available_recipes)]
        elif "snack" in meal_name.lower():
            available = [find_recipe_by_title(title, available_recipes) 
                        for title in selected_snacks if find_recipe_by_title(title, available_recipes)]
        else:
            # Fallback to any available recipe
            available = available_recipes
        
        # Remove None values
        available = [r for r in available if r is not None]
        
        if available:
            selected_recipe = random.choice(available)
            portion_multiplier = calculate_portion_multiplier(selected_recipe, target_meal_calories)
            
            meal_plan[meal_name] = {
                'recipe': selected_recipe,
                'portion_multiplier': portion_multiplier,
                'target_calories': target_meal_calories
            }
        else:
            meal_plan[meal_name] = {
                'recipe': None,
                'portion_multiplier': 1.0,
                'target_calories': target_meal_calories
            }
    
    return meal_plan

# Generate meal plan button
if st.button("🎯 Generate Fitomics Meal Plan", type="primary", use_container_width=True):
    selected_recipes = {
        'breakfast': selected_breakfast,
        'lunch': selected_lunch,
        'dinner': selected_dinner,
        'snacks': selected_snacks
    }
    
    if not any(selected_recipes.values()):
        st.error("Please select at least one recipe from any category.")
    else:
        with st.spinner("Creating your personalized meal plan with Fitomics recipes..."):
            meal_plan = create_fitomics_meal_plan(meal_structure, selected_recipes)
            st.session_state.ai_meal_plans[date_key] = meal_plan
            st.success("Fitomics meal plan generated successfully!")
            st.rerun()

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
                
                # Show recipe details in expander
                if st.button(f"View {recipe['title']} Recipe", key=f"recipe_{meal_name}"):
                    with st.expander(f"📖 {recipe['title']} Recipe", expanded=True):
                        if recipe.get('directions'):
                            st.markdown("**Directions:**")
                            for i, direction in enumerate(recipe['directions'], 1):
                                st.markdown(f"{i}. {direction}")
                        
                        st.markdown(f"**Servings:** {recipe.get('servings', 1)}")
                        
                        if recipe.get('tags'):
                            st.markdown(f"**Tags:** {' '.join(recipe['tags'])}")
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
    - Breakfast: {len(recipe_categories['breakfast'])} recipes
    - Lunch: {len(recipe_categories['lunch'])} recipes
    - Dinner: {len(recipe_categories['dinner'])} recipes
    - Snacks: {len(recipe_categories['snack'])} recipes
    - Desserts: {len(recipe_categories['dessert'])} recipes
    
    **Your Settings:**
    - Meal frequency: {meal_frequency} meals per day
    - Daily targets: {target_calories} cal, {target_protein}g protein, {target_carbs}g carbs, {target_fat}g fat
    - Dietary restrictions: {", ".join(dietary_restrictions) if dietary_restrictions else "None"}
    
    **Total recipes available:** {len(available_recipes)} (filtered by your dietary restrictions)
    """)