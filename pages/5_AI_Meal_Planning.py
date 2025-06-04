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
st.markdown("*Intelligent meal planning with curated food selections based on your preferences*")

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

# Curated food database with USDA FDC IDs for accurate nutrition
CURATED_FOODS = {
    "proteins": {
        "Chicken Breast": {"fdc_id": "171077", "search": "chicken breast"},
        "Salmon Fillet": {"fdc_id": "175167", "search": "salmon atlantic"},
        "Ground Turkey": {"fdc_id": "171484", "search": "turkey ground"},
        "Lean Beef": {"fdc_id": "174032", "search": "beef ground 93/7"},
        "Eggs": {"fdc_id": "173424", "search": "egg whole"},
        "Greek Yogurt": {"fdc_id": "170894", "search": "yogurt greek plain"},
        "Cottage Cheese": {"fdc_id": "170851", "search": "cottage cheese"},
        "Tofu": {"fdc_id": "174276", "search": "tofu firm"},
        "Tuna": {"fdc_id": "175149", "search": "tuna yellowfin"},
        "Cod": {"fdc_id": "175415", "search": "cod atlantic"}
    },
    "carbs": {
        "Brown Rice": {"fdc_id": "168880", "search": "rice brown cooked"},
        "Quinoa": {"fdc_id": "168917", "search": "quinoa cooked"},
        "Oatmeal": {"fdc_id": "173904", "search": "oats rolled"},
        "Sweet Potato": {"fdc_id": "168482", "search": "sweet potato"},
        "Whole Wheat Bread": {"fdc_id": "172687", "search": "bread whole wheat"},
        "Pasta": {"fdc_id": "169714", "search": "pasta whole wheat"},
        "Black Beans": {"fdc_id": "173735", "search": "beans black"},
        "Banana": {"fdc_id": "173944", "search": "banana"},
        "Apple": {"fdc_id": "171688", "search": "apple"},
        "Berries": {"fdc_id": "171711", "search": "blueberries"}
    },
    "fats": {
        "Olive Oil": {"fdc_id": "171413", "search": "olive oil"},
        "Avocado": {"fdc_id": "171706", "search": "avocado"},
        "Almonds": {"fdc_id": "170567", "search": "almonds"},
        "Walnuts": {"fdc_id": "170187", "search": "walnuts"},
        "Peanut Butter": {"fdc_id": "172430", "search": "peanut butter"},
        "Coconut Oil": {"fdc_id": "171412", "search": "coconut oil"},
        "Salmon Oil": {"fdc_id": "173577", "search": "fish oil"},
        "Cashews": {"fdc_id": "170162", "search": "cashews"},
        "Flax Seeds": {"fdc_id": "169414", "search": "flaxseed"},
        "Chia Seeds": {"fdc_id": "170554", "search": "chia seeds"}
    }
}

# Food selection interface
st.subheader("🍽️ Customize Your Meal Plan")

# Get user preferences
preferred_proteins = diet_prefs.get('preferred_proteins', [])
dietary_restrictions = diet_prefs.get('dietary_restrictions', [])
meal_frequency = diet_prefs.get('meal_frequency', 3)

# Filter foods based on dietary restrictions
def filter_foods_by_restrictions(foods_dict, restrictions):
    filtered = {}
    for name, data in foods_dict.items():
        include = True
        
        # Apply dietary restriction filters
        if 'Vegetarian' in restrictions:
            meat_items = ['Chicken Breast', 'Salmon Fillet', 'Ground Turkey', 'Lean Beef', 'Tuna', 'Cod']
            if name in meat_items:
                include = False
        
        if 'Vegan' in restrictions:
            animal_items = ['Chicken Breast', 'Salmon Fillet', 'Ground Turkey', 'Lean Beef', 'Tuna', 'Cod', 
                          'Eggs', 'Greek Yogurt', 'Cottage Cheese']
            if name in animal_items:
                include = False
        
        if 'Gluten-Free' in restrictions:
            gluten_items = ['Whole Wheat Bread', 'Pasta']
            if name in gluten_items:
                include = False
        
        if 'Dairy-Free' in restrictions:
            dairy_items = ['Greek Yogurt', 'Cottage Cheese']
            if name in dairy_items:
                include = False
        
        if include:
            filtered[name] = data
    
    return filtered

# Filter foods based on preferences
available_proteins = filter_foods_by_restrictions(CURATED_FOODS["proteins"], dietary_restrictions)
available_carbs = filter_foods_by_restrictions(CURATED_FOODS["carbs"], dietary_restrictions)
available_fats = filter_foods_by_restrictions(CURATED_FOODS["fats"], dietary_restrictions)

# Food selection interface
col1, col2, col3 = st.columns(3)

with col1:
    st.markdown("**Select Proteins:**")
    selected_proteins = st.multiselect(
        "Choose your preferred proteins",
        options=list(available_proteins.keys()),
        default=list(available_proteins.keys())[:3],
        key="protein_selection"
    )

with col2:
    st.markdown("**Select Carbs:**")
    selected_carbs = st.multiselect(
        "Choose your preferred carbohydrates",
        options=list(available_carbs.keys()),
        default=list(available_carbs.keys())[:3],
        key="carb_selection"
    )

with col3:
    st.markdown("**Select Fats:**")
    selected_fats = st.multiselect(
        "Choose your preferred fats",
        options=list(available_fats.keys()),
        default=list(available_fats.keys())[:3],
        key="fat_selection"
    )

# Date selector
st.markdown("---")
selected_date = st.date_input("Plan meals for:", value=date.today())
date_key = selected_date.isoformat()

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

# Function to get nutritional data from USDA
def get_food_nutrition(food_name, search_term):
    try:
        foods = fdc_api.search_foods(search_term, page_size=5)
        if foods and len(foods) > 0:
            food = foods[0]
            food_details = fdc_api.get_food_details(food['fdcId'])
            nutrients = fdc_api.extract_nutrients(food_details)
            return {
                'name': food_name,
                'description': food.get('description', food_name),
                'calories': nutrients.get('calories', 0),
                'protein': nutrients.get('protein', 0),
                'carbs': nutrients.get('carbs', 0),
                'fat': nutrients.get('fat', 0)
            }
    except Exception as e:
        st.error(f"Error fetching nutrition data for {food_name}: {str(e)}")
    
    return None

# Function to create meal plan with selected foods
def create_customized_meal_plan(meal_type, target_calories, proteins, carbs, fats):
    meal_foods = []
    
    # Calculate target calories for each macronutrient
    protein_calories = int(target_calories * 0.30)  # 30% protein
    carb_calories = int(target_calories * 0.45)     # 45% carbs
    fat_calories = int(target_calories * 0.25)      # 25% fat
    
    # Select foods for this meal
    if proteins:
        protein_choice = random.choice(proteins)
        protein_data = available_proteins[protein_choice]
        protein_nutrition = get_food_nutrition(protein_choice, protein_data["search"])
        
        if protein_nutrition and protein_nutrition['calories'] > 0:
            serving_size = (protein_calories / protein_nutrition['calories']) * 100
            meal_foods.append({
                'name': protein_choice,
                'serving_size': round(serving_size),
                'calories': round(protein_nutrition['calories'] * serving_size / 100),
                'protein': round(protein_nutrition['protein'] * serving_size / 100),
                'carbs': round(protein_nutrition['carbs'] * serving_size / 100),
                'fat': round(protein_nutrition['fat'] * serving_size / 100)
            })
    
    if carbs:
        carb_choice = random.choice(carbs)
        carb_data = available_carbs[carb_choice]
        carb_nutrition = get_food_nutrition(carb_choice, carb_data["search"])
        
        if carb_nutrition and carb_nutrition['calories'] > 0:
            serving_size = (carb_calories / carb_nutrition['calories']) * 100
            meal_foods.append({
                'name': carb_choice,
                'serving_size': round(serving_size),
                'calories': round(carb_nutrition['calories'] * serving_size / 100),
                'protein': round(carb_nutrition['protein'] * serving_size / 100),
                'carbs': round(carb_nutrition['carbs'] * serving_size / 100),
                'fat': round(carb_nutrition['fat'] * serving_size / 100)
            })
    
    if fats:
        fat_choice = random.choice(fats)
        fat_data = available_fats[fat_choice]
        fat_nutrition = get_food_nutrition(fat_choice, fat_data["search"])
        
        if fat_nutrition and fat_nutrition['calories'] > 0:
            serving_size = (fat_calories / fat_nutrition['calories']) * 100
            meal_foods.append({
                'name': fat_choice,
                'serving_size': round(serving_size),
                'calories': round(fat_nutrition['calories'] * serving_size / 100),
                'protein': round(fat_nutrition['protein'] * serving_size / 100),
                'carbs': round(fat_nutrition['carbs'] * serving_size / 100),
                'fat': round(fat_nutrition['fat'] * serving_size / 100)
            })
    
    return meal_foods

# Generate meal plan button
if st.button("🎯 Generate Customized Meal Plan", type="primary", use_container_width=True):
    if not selected_proteins or not selected_carbs or not selected_fats:
        st.error("Please select at least one option from each food category (proteins, carbs, fats).")
    else:
        with st.spinner("Creating your customized meal plan with USDA nutritional data..."):
            meal_plan = {}
            
            for meal_name, calorie_percentage in meal_structure.items():
                target_meal_calories = int(target_calories * calorie_percentage)
                
                # Create meal plan for this meal using selected foods
                meal_foods = create_customized_meal_plan(
                    meal_name, 
                    target_meal_calories, 
                    selected_proteins, 
                    selected_carbs, 
                    selected_fats
                )
                
                meal_plan[meal_name] = {
                    'foods': meal_foods,
                    'target_calories': target_meal_calories
                }
            
            st.session_state.ai_meal_plans[date_key] = meal_plan
            st.success("Customized meal plan generated with authentic USDA nutritional data!")
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
                st.warning("No foods selected for this meal. Please adjust your selections and try again.")
    
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
    st.info("Select your preferred foods above and click 'Generate Customized Meal Plan' to create your personalized nutrition plan.")

# Food preferences info
with st.expander("ℹ️ Your Current Preferences"):
    st.markdown(f"""
    **Meal Planning Settings:**
    - Meal frequency: {meal_frequency} meals per day
    - Daily targets: {target_calories} cal, {target_protein}g protein, {target_carbs}g carbs, {target_fat}g fat
    - Dietary restrictions: {", ".join(dietary_restrictions) if dietary_restrictions else "None"}
    
    **Available Foods:**
    - Proteins: {len(available_proteins)} options
    - Carbohydrates: {len(available_carbs)} options  
    - Fats: {len(available_fats)} options
    
    **Selected for meal planning:**
    - Proteins: {", ".join(selected_proteins) if selected_proteins else "None selected"}
    - Carbs: {", ".join(selected_carbs) if selected_carbs else "None selected"}
    - Fats: {", ".join(selected_fats) if selected_fats else "None selected"}
    """)