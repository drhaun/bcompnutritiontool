import streamlit as st
import pandas as pd
import numpy as np
from datetime import datetime
import sys
import os

# Add the root directory to the path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import utils

# Set page title and layout
st.set_page_config(
    page_title="Fitomics - Nutrition Plan",
    page_icon="💪",
    layout="wide"
)

# Attempt to load existing data
utils.load_data()

# Check if user has completed the initial setup and goals
if not st.session_state.user_info['gender'] or not st.session_state.goal_info.get('goal_type'):
    st.warning("Please complete the Initial Setup and Body Composition Goals first!")
    st.stop()

st.title("Nutrition Plan")
st.markdown("Based on your goals, here's your personalized nutrition plan.")

# Calculate TDEE and nutrition targets if not already set
if not st.session_state.nutrition_plan.get('target_calories'):
    # Get user information
    gender = st.session_state.user_info['gender']
    weight_kg = st.session_state.user_info['weight_kg']
    height_cm = st.session_state.user_info['height_cm']
    age = st.session_state.user_info['age']
    activity_level = st.session_state.user_info['activity_level']
    
    # Get goal information
    goal_type = st.session_state.goal_info['goal_type']
    target_weight = st.session_state.goal_info['target_weight_kg']
    timeline_weeks = st.session_state.goal_info['timeline_weeks']
    
    # Calculate weekly change rate
    weekly_change = (target_weight - weight_kg) / timeline_weeks
    
    # Calculate TDEE
    tdee = utils.calculate_tdee(gender, weight_kg, height_cm, age, activity_level)
    
    # Calculate target calories based on goal
    target_calories = utils.calculate_target_calories(tdee, goal_type, abs(weekly_change))
    
    # Calculate macros
    macros = utils.calculate_macros(target_calories, weight_kg, goal_type)
    
    # Set nutrition plan
    st.session_state.nutrition_plan = {
        'target_calories': round(target_calories),
        'target_protein': macros['protein'],
        'target_carbs': macros['carbs'],
        'target_fat': macros['fat'],
        'weekly_adjustments': []
    }
    
    # Save data
    utils.save_data()

# Display current nutrition plan
st.subheader("Your Nutrition Targets")

col1, col2, col3, col4 = st.columns(4)
with col1:
    st.metric("Daily Calories", f"{st.session_state.nutrition_plan['target_calories']} kcal")
with col2:
    st.metric("Protein", f"{st.session_state.nutrition_plan['target_protein']} g")
with col3:
    st.metric("Carbohydrates", f"{st.session_state.nutrition_plan['target_carbs']} g")
with col4:
    st.metric("Fat", f"{st.session_state.nutrition_plan['target_fat']} g")

# Calculate macronutrient ratios for the pie chart
protein_calories = st.session_state.nutrition_plan['target_protein'] * 4
carb_calories = st.session_state.nutrition_plan['target_carbs'] * 4
fat_calories = st.session_state.nutrition_plan['target_fat'] * 9
total_calories = protein_calories + carb_calories + fat_calories

protein_ratio = protein_calories / total_calories * 100
carb_ratio = carb_calories / total_calories * 100
fat_ratio = fat_calories / total_calories * 100

st.write(f"Macronutrient Ratio: {protein_ratio:.0f}% Protein | {carb_ratio:.0f}% Carbs | {fat_ratio:.0f}% Fat")

# Manual Adjustment Form
st.subheader("Adjust Your Plan (Optional)")
st.markdown("If you'd like to customize your nutrition targets, you can make adjustments below.")

with st.form("nutrition_adjustment_form"):
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        calories = st.number_input(
            "Daily Calories",
            min_value=1000,
            max_value=10000,
            value=st.session_state.nutrition_plan['target_calories'],
            step=50
        )
    
    with col2:
        protein = st.number_input(
            "Protein (g)",
            min_value=50,
            max_value=500,
            value=st.session_state.nutrition_plan['target_protein'],
            step=5
        )
    
    with col3:
        carbs = st.number_input(
            "Carbohydrates (g)",
            min_value=20,
            max_value=1000,
            value=st.session_state.nutrition_plan['target_carbs'],
            step=5
        )
    
    with col4:
        fat = st.number_input(
            "Fat (g)",
            min_value=20,
            max_value=500,
            value=st.session_state.nutrition_plan['target_fat'],
            step=5
        )
    
    # Check if macros add up to target calories
    calculated_calories = (protein * 4) + (carbs * 4) + (fat * 9)
    calorie_diff = abs(calculated_calories - calories)
    
    if calorie_diff > 50:
        st.warning(f"Your macronutrient selections add up to {calculated_calories} calories, which is {calorie_diff} calories different from your target. Consider adjusting your macros.")
    
    submit_button = st.form_submit_button("Update Nutrition Plan")
    
    if submit_button:
        # Update session state
        st.session_state.nutrition_plan['target_calories'] = calories
        st.session_state.nutrition_plan['target_protein'] = protein
        st.session_state.nutrition_plan['target_carbs'] = carbs
        st.session_state.nutrition_plan['target_fat'] = fat
        
        # Save data
        utils.save_data()
        
        st.success("Nutrition plan updated!")

# Meal Plan Guidance
st.subheader("Meal Planning Guidance")

# Calculate meal distribution based on 3-5 meals per day
meal_examples = []

# 3 Meals
meals_3 = [
    {
        'name': 'Breakfast (30%)',
        'calories': round(st.session_state.nutrition_plan['target_calories'] * 0.3),
        'protein': round(st.session_state.nutrition_plan['target_protein'] * 0.3),
        'carbs': round(st.session_state.nutrition_plan['target_carbs'] * 0.3),
        'fat': round(st.session_state.nutrition_plan['target_fat'] * 0.3),
    },
    {
        'name': 'Lunch (40%)',
        'calories': round(st.session_state.nutrition_plan['target_calories'] * 0.4),
        'protein': round(st.session_state.nutrition_plan['target_protein'] * 0.4),
        'carbs': round(st.session_state.nutrition_plan['target_carbs'] * 0.4),
        'fat': round(st.session_state.nutrition_plan['target_fat'] * 0.4),
    },
    {
        'name': 'Dinner (30%)',
        'calories': round(st.session_state.nutrition_plan['target_calories'] * 0.3),
        'protein': round(st.session_state.nutrition_plan['target_protein'] * 0.3),
        'carbs': round(st.session_state.nutrition_plan['target_carbs'] * 0.3),
        'fat': round(st.session_state.nutrition_plan['target_fat'] * 0.3),
    }
]

# 5 Meals
meals_5 = [
    {
        'name': 'Breakfast (20%)',
        'calories': round(st.session_state.nutrition_plan['target_calories'] * 0.2),
        'protein': round(st.session_state.nutrition_plan['target_protein'] * 0.2),
        'carbs': round(st.session_state.nutrition_plan['target_carbs'] * 0.2),
        'fat': round(st.session_state.nutrition_plan['target_fat'] * 0.2),
    },
    {
        'name': 'Mid-Morning Snack (15%)',
        'calories': round(st.session_state.nutrition_plan['target_calories'] * 0.15),
        'protein': round(st.session_state.nutrition_plan['target_protein'] * 0.15),
        'carbs': round(st.session_state.nutrition_plan['target_carbs'] * 0.15),
        'fat': round(st.session_state.nutrition_plan['target_fat'] * 0.15),
    },
    {
        'name': 'Lunch (30%)',
        'calories': round(st.session_state.nutrition_plan['target_calories'] * 0.3),
        'protein': round(st.session_state.nutrition_plan['target_protein'] * 0.3),
        'carbs': round(st.session_state.nutrition_plan['target_carbs'] * 0.3),
        'fat': round(st.session_state.nutrition_plan['target_fat'] * 0.3),
    },
    {
        'name': 'Afternoon Snack (15%)',
        'calories': round(st.session_state.nutrition_plan['target_calories'] * 0.15),
        'protein': round(st.session_state.nutrition_plan['target_protein'] * 0.15),
        'carbs': round(st.session_state.nutrition_plan['target_carbs'] * 0.15),
        'fat': round(st.session_state.nutrition_plan['target_fat'] * 0.15),
    },
    {
        'name': 'Dinner (20%)',
        'calories': round(st.session_state.nutrition_plan['target_calories'] * 0.2),
        'protein': round(st.session_state.nutrition_plan['target_protein'] * 0.2),
        'carbs': round(st.session_state.nutrition_plan['target_carbs'] * 0.2),
        'fat': round(st.session_state.nutrition_plan['target_fat'] * 0.2),
    }
]

tab1, tab2 = st.tabs(["3 Meal Plan", "5 Meal Plan"])

with tab1:
    st.table(pd.DataFrame(meals_3))

with tab2:
    st.table(pd.DataFrame(meals_5))

# Food suggestions based on the goal
st.subheader("Food Suggestions")

goal_type = st.session_state.goal_info['goal_type']

if goal_type == "lose_fat":
    st.markdown("""
    **Recommended Foods for Fat Loss:**
    
    *Protein Sources:*
    - Lean meats (chicken breast, turkey, lean beef)
    - Fish (tuna, salmon, tilapia)
    - Egg whites or whole eggs
    - Low-fat dairy (Greek yogurt, cottage cheese)
    - Plant-based options (tofu, tempeh, seitan)
    
    *Carbohydrates:*
    - Whole grains (brown rice, quinoa, oats)
    - Starchy vegetables (sweet potatoes, squash)
    - Fruits (berries, apples, oranges)
    - Beans and legumes
    
    *Fats:*
    - Avocados
    - Nuts and seeds (in moderation)
    - Olive oil (limited quantities)
    - Fatty fish (salmon, mackerel)
    
    *Vegetables:*
    - Focus on high-volume, low-calorie options like leafy greens, broccoli, cauliflower, zucchini, bell peppers
    - Aim for at least 3-5 servings per day
    
    *Tips:*
    - Focus on high-protein, high-fiber foods to increase satiety
    - Limit added sugars and processed foods
    - Prioritize water and zero-calorie beverages
    """)
elif goal_type == "gain_muscle":
    st.markdown("""
    **Recommended Foods for Muscle Gain:**
    
    *Protein Sources:*
    - Lean and fatty meats (chicken, beef, pork)
    - Fish and seafood
    - Whole eggs
    - Dairy (Greek yogurt, cottage cheese, milk)
    - Plant-based options (tofu, tempeh, seitan, protein powder)
    
    *Carbohydrates:*
    - Whole grains (rice, pasta, bread, oats)
    - Starchy vegetables (potatoes, sweet potatoes)
    - Fruits (bananas, apples, berries)
    - Legumes and beans
    
    *Fats:*
    - Avocados
    - Nuts and nut butters
    - Olive oil and other healthy oils
    - Fatty fish
    - Full-fat dairy
    
    *Vegetables:*
    - Include a variety of vegetables for micronutrients
    - Dark leafy greens, broccoli, bell peppers, etc.
    
    *Tips:*
    - Eat more calorie-dense foods if struggling to meet calorie targets
    - Consider liquid calories (smoothies, shakes) to increase intake
    - Time protein intake around workouts
    - Focus on nutrient-dense whole foods
    """)
else:  # maintain
    st.markdown("""
    **Recommended Foods for Maintenance:**
    
    *Protein Sources:*
    - Balance of lean and fatty meats
    - Fish and seafood
    - Eggs
    - Dairy products
    - Plant-based proteins
    
    *Carbohydrates:*
    - Whole grains
    - Starchy vegetables
    - Fruits
    - Legumes and beans
    
    *Fats:*
    - Avocados
    - Nuts and seeds
    - Olive oil and other healthy oils
    - Fatty fish
    
    *Vegetables:*
    - Aim for variety and different colors
    - Include both starchy and non-starchy options
    
    *Tips:*
    - Focus on whole, unprocessed foods
    - Maintain a balance of all macronutrients
    - Practice portion control
    - Listen to hunger and fullness cues
    """)

# Show navigation hint
st.markdown("---")
st.markdown("👈 Use the sidebar to navigate between pages")
st.markdown("👉 Next step: [Daily Monitoring](/Daily_Monitoring)")
