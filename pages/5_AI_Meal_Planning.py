import streamlit as st
import pandas as pd
import json
import sys
import os
import random
import math
from datetime import datetime, date

# Import FDC API for real nutritional data
sys.path.append(os.path.abspath(os.path.dirname(__file__) + '/../'))
import fdc_api
import utils

st.set_page_config(page_title="AI Meal Planner", page_icon="🤖", layout="wide")

# Header
st.title("🤖 AI Meal Planner")
st.markdown("*Intelligent meal planning with real nutritional data from USDA database*")

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
        # Get user data for calculations
        user_info = st.session_state.user_info
        goal_info = st.session_state.goal_info
        
        # Calculate TDEE and macros
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
            
            # Save to nutrition plan
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

# Safely get nutrition targets with proper defaults
target_calories = nutrition_plan.get('target_calories', 2000)
target_protein = nutrition_plan.get('target_protein', 150)
target_carbs = nutrition_plan.get('target_carbs', 200)
target_fat = nutrition_plan.get('target_fat', 70)

# Handle NaN values by providing defaults
def safe_value(value, default):
    try:
        if value is None or (isinstance(value, float) and math.isnan(value)):
            return default
        return float(value)
    except (TypeError, ValueError):
        return default

target_calories = safe_value(target_calories, 2000)
target_protein = safe_value(target_protein, 150)
target_carbs = safe_value(target_carbs, 200)
target_fat = safe_value(target_fat, 70)

# Convert to integers
target_calories = int(target_calories)
target_protein = int(target_protein)
target_carbs = int(target_carbs)
target_fat = int(target_fat)

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

# Meal planning section
st.subheader("🍽️ Smart Meal Planning")

# Date selector
selected_date = st.date_input("Plan meals for:", value=date.today())
date_key = selected_date.isoformat()

# Get meal frequency
meal_frequency = diet_prefs.get('meal_frequency', 3)
preferred_proteins = diet_prefs.get('preferred_proteins', [])

# Define meal structure based on frequency
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

# Simplified food search function
def create_meal_plan(meal_type, target_calories):
    """Create a meal plan using specific foods from USDA database"""
    
    # Define specific food combinations for each meal type
    meal_combinations = {
        "breakfast": [
            {"protein": "egg", "carb": "oatmeal", "fat": "almonds"},
            {"protein": "greek yogurt", "carb": "banana", "fat": "walnuts"},
            {"protein": "cottage cheese", "carb": "bread whole wheat", "fat": "peanut butter"}
        ],
        "lunch": [
            {"protein": "chicken breast", "carb": "quinoa", "fat": "olive oil"},
            {"protein": "salmon", "carb": "brown rice", "fat": "avocado"},
            {"protein": "turkey", "carb": "sweet potato", "fat": "almonds"}
        ],
        "dinner": [
            {"protein": "chicken breast", "carb": "brown rice", "fat": "olive oil"},
            {"protein": "salmon", "carb": "quinoa", "fat": "avocado"},
            {"protein": "lean beef", "carb": "sweet potato", "fat": "nuts"}
        ],
        "snack": [
            {"protein": "greek yogurt", "carb": "berries", "fat": "almonds"},
            {"protein": "cottage cheese", "carb": "apple", "fat": "walnuts"}
        ]
    }
    
    # Get meal type category
    meal_category = "breakfast" if "breakfast" in meal_type.lower() else \
                   "snack" if "snack" in meal_type.lower() else \
                   "lunch" if "lunch" in meal_type.lower() else "dinner"
    
    # Select random combination
    combination = random.choice(meal_combinations[meal_category])
    
    # Calculate target calories for each macronutrient
    protein_calories = int(target_calories * 0.30)  # 30% protein
    carb_calories = int(target_calories * 0.45)     # 45% carbs
    fat_calories = int(target_calories * 0.25)      # 25% fat
    
    meal_foods = []
    
    try:
        # Search for protein food
        st.write(f"Debug: Searching for protein: {combination['protein']}")
        protein_foods = fdc_api.search_foods(combination["protein"], page_size=3)
        st.write(f"Debug: Found {len(protein_foods) if protein_foods else 0} protein foods")
        
        if protein_foods and len(protein_foods) > 0:
            food = protein_foods[0]
            st.write(f"Debug: Selected protein: {food.get('description', 'Unknown')}")
            food_details = fdc_api.get_food_details(food['fdcId'])
            nutrients = fdc_api.extract_nutrients(food_details)
            st.write(f"Debug: Protein nutrients - Calories: {nutrients.get('calories', 0)}")
            
            if nutrients.get('calories', 0) > 0:
                serving_size = (protein_calories / nutrients['calories']) * 100
                meal_foods.append({
                    'name': food['description'],
                    'serving_size': round(serving_size),
                    'calories': round(nutrients['calories'] * serving_size / 100),
                    'protein': round(nutrients.get('protein', 0) * serving_size / 100),
                    'carbs': round(nutrients.get('carbs', 0) * serving_size / 100),
                    'fat': round(nutrients.get('fat', 0) * serving_size / 100)
                })
                st.write(f"Debug: Added protein food to meal")
        else:
            st.write(f"Debug: No protein foods found for {combination['protein']}")
        
        # Search for carb food
        carb_foods = fdc_api.search_foods(combination["carb"], page_size=3)
        if carb_foods:
            food = carb_foods[0]
            food_details = fdc_api.get_food_details(food['fdcId'])
            nutrients = fdc_api.extract_nutrients(food_details)
            
            if nutrients.get('calories', 0) > 0:
                serving_size = (carb_calories / nutrients['calories']) * 100
                meal_foods.append({
                    'name': food['description'],
                    'serving_size': round(serving_size),
                    'calories': round(nutrients['calories'] * serving_size / 100),
                    'protein': round(nutrients.get('protein', 0) * serving_size / 100),
                    'carbs': round(nutrients.get('carbs', 0) * serving_size / 100),
                    'fat': round(nutrients.get('fat', 0) * serving_size / 100)
                })
        
        # Search for fat food
        fat_foods = fdc_api.search_foods(combination["fat"], page_size=3)
        if fat_foods:
            food = fat_foods[0]
            food_details = fdc_api.get_food_details(food['fdcId'])
            nutrients = fdc_api.extract_nutrients(food_details)
            
            if nutrients.get('calories', 0) > 0:
                serving_size = (fat_calories / nutrients['calories']) * 100
                meal_foods.append({
                    'name': food['description'],
                    'serving_size': round(serving_size),
                    'calories': round(nutrients['calories'] * serving_size / 100),
                    'protein': round(nutrients.get('protein', 0) * serving_size / 100),
                    'carbs': round(nutrients.get('carbs', 0) * serving_size / 100),
                    'fat': round(nutrients.get('fat', 0) * serving_size / 100)
                })
        
        return meal_foods
        
    except Exception as e:
        st.error(f"Error accessing USDA database: {str(e)}")
        return []

# Generate meal plan button
if st.button("🎯 Generate Smart Meal Plan", type="primary", use_container_width=True):
    with st.spinner("Searching USDA database for optimal foods..."):
        meal_plan = {}
        
        for meal_name, calorie_percentage in meal_structure.items():
            target_meal_calories = int(target_calories * calorie_percentage)
            
            # Create meal plan for this meal
            meal_foods = create_meal_plan(meal_name, target_meal_calories)
            meal_plan[meal_name] = {
                'foods': meal_foods,
                'target_calories': target_meal_calories
            }
        
        st.session_state.ai_meal_plans[date_key] = meal_plan
        st.success("Meal plan generated using real USDA food data!")
        st.rerun()

# Display meal plan if it exists
if date_key in st.session_state.ai_meal_plans and st.session_state.ai_meal_plans[date_key]:
    st.subheader(f"🍽️ Your Meal Plan for {selected_date.strftime('%B %d, %Y')}")
    
    total_calories = 0
    total_protein = 0
    total_carbs = 0
    total_fat = 0
    grocery_list = []
    
    for meal_name, meal_data in st.session_state.ai_meal_plans[date_key].items():
        with st.expander(f"🍴 {meal_name} - Target: {meal_data['target_calories']} calories", expanded=True):
            meal_calories = 0
            meal_protein = 0
            meal_carbs = 0
            meal_fat = 0
            
            if meal_data['foods']:
                for food in meal_data['foods']:
                    st.markdown(f"**{food['name']}** - {food['serving_size']}g")
                    
                    # Display nutrition
                    col1, col2, col3, col4 = st.columns(4)
                    with col1:
                        st.metric("Calories", f"{food['calories']}")
                    with col2:
                        st.metric("Protein", f"{food['protein']}g")
                    with col3:
                        st.metric("Carbs", f"{food['carbs']}g")
                    with col4:
                        st.metric("Fat", f"{food['fat']}g")
                    
                    # Add to totals
                    meal_calories += food['calories']
                    meal_protein += food['protein']
                    meal_carbs += food['carbs']
                    meal_fat += food['fat']
                    
                    # Add to grocery list
                    grocery_list.append(f"{food['name']} ({food['serving_size']}g)")
                    
                    st.markdown("---")
                
                # Show meal totals
                st.markdown("**Meal Totals:**")
                mcol1, mcol2, mcol3, mcol4 = st.columns(4)
                with mcol1:
                    st.metric("Total Calories", f"{meal_calories}")
                with mcol2:
                    st.metric("Total Protein", f"{meal_protein}g")
                with mcol3:
                    st.metric("Total Carbs", f"{meal_carbs}g")
                with mcol4:
                    st.metric("Total Fat", f"{meal_fat}g")
                
                total_calories += meal_calories
                total_protein += meal_protein
                total_carbs += meal_carbs
                total_fat += meal_fat
            else:
                st.warning("No foods found for this meal. Please try generating again.")
    
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
        grocery_text = f"Grocery List for {selected_date.strftime('%B %d, %Y')}\n\n"
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
                file_name=f"grocery_list_{date_key}.txt",
                mime="text/plain"
            )

else:
    st.info("Click 'Generate Smart Meal Plan' to create your personalized meal plan using real USDA food data.")

# Help section
with st.expander("ℹ️ How it works"):
    st.markdown(f"""
    **The AI Meal Planner uses real USDA food database to:**
    
    - Search for actual foods based on meal type and nutritional needs
    - Calculate precise portions to hit your calorie targets
    - Distribute macronutrients optimally across meals
    - Generate accurate grocery lists with specific amounts
    - Provide meal-appropriate food suggestions
    
    **Your current settings:**
    - Meal frequency: {meal_frequency} meals per day
    - Daily targets: {target_calories} cal, {target_protein}g protein, {target_carbs}g carbs, {target_fat}g fat
    - Preferred proteins: {", ".join(preferred_proteins) if preferred_proteins else "All proteins"}
    """)