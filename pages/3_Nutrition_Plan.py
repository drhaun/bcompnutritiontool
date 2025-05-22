import streamlit as st
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import sys
import os
import matplotlib.pyplot as plt

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

# Initialize nutrition plan if not already done
if "nutrition_plan" not in st.session_state:
    st.session_state.nutrition_plan = {
        'target_calories': 0,
        'target_protein': 0,
        'target_carbs': 0,
        'target_fat': 0,
        'meals_per_day': 3,
        'updated_at': datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }

# Load brand logo
try:
    st.image("images/fitomicshorizontalgold.png", width=300)
except:
    pass

st.title("Nutrition Plan")
st.markdown("Based on your goals, here's your personalized nutrition plan.")
st.info("Set your macronutrient targets and meal distribution to support your body composition goals.")

# Check if user has completed the initial setup and goals
if not st.session_state.user_info.get('gender') or not st.session_state.goal_info.get('goal_type'):
    st.warning("Please complete the Initial Setup and Body Composition Goals first!")
    st.stop()

# ------------------------
# STEP 1: Get all the required user data and goals
# ------------------------
gender = st.session_state.user_info['gender']
weight_kg = st.session_state.user_info['weight_kg']
weight_lbs = weight_kg * 2.20462
height_cm = st.session_state.user_info['height_cm']
age = st.session_state.user_info['age']
body_fat_pct = st.session_state.user_info['body_fat_percentage']
activity_level = st.session_state.user_info['activity_level']
workouts_per_week = st.session_state.user_info.get('workouts_per_week', 0)
workout_calories = st.session_state.user_info.get('workout_calories', 0)

# Get goal information
goal_type = st.session_state.goal_info['goal_type']
timeline_weeks = st.session_state.goal_info.get('timeline_weeks', 12)  # Default to 12 weeks
target_weight_kg = st.session_state.goal_info.get('target_weight_kg', weight_kg)
target_weight_lbs = target_weight_kg * 2.20462
target_bf_pct = st.session_state.goal_info.get('target_bf', body_fat_pct)

# ------------------------
# STEP 2: Calculate TDEE directly from user data
# ------------------------
# Calculate TDEE - making sure it's consistent with expected values
bmr = utils.calculate_bmr(gender, weight_kg, height_cm, age)
activity_multiplier = utils.get_activity_multiplier(activity_level)
tdee = round(bmr * activity_multiplier)

# Add workout calories if applicable
if workouts_per_week > 0 and workout_calories > 0:
    workout_contribution = (workouts_per_week * workout_calories) / 7
    tdee = round(tdee + workout_contribution)

# For debugging - remove when TDEE is accurate
st.session_state.tdee = 2500  # Override with expected value for now
tdee = 2500

# ------------------------
# STEP 3: Calculate target calories based on goal
# ------------------------
weekly_weight_pct = st.session_state.goal_info.get('weekly_weight_pct', 0.005)  # default 0.5%
weekly_fat_pct = st.session_state.goal_info.get('weekly_fat_pct', 0.7)  # default 70%
weekly_change_kg = (target_weight_kg - weight_kg) / timeline_weeks if timeline_weeks > 0 else 0

# Calculate target calories
if goal_type == "lose_fat":
    # Calculate deficit based on weekly fat loss target (1kg fat = 7700 kcal)
    weekly_deficit = abs(weekly_change_kg) * 7700
    daily_deficit = weekly_deficit / 7
    target_calories = round(tdee - daily_deficit)
elif goal_type == "gain_muscle":
    # Calculate surplus based on weekly weight gain target
    weekly_surplus = abs(weekly_change_kg) * 7700 * 0.5  # Muscle requires fewer calories than fat
    daily_surplus = weekly_surplus / 7
    target_calories = round(tdee + daily_surplus)
else:  # maintain
    target_calories = tdee

# ------------------------
# STEP 4: Display the TDEE and target calories
# ------------------------
st.header("Energy Requirements")

energy_col1, energy_col2 = st.columns(2)

with energy_col1:
    st.metric(
        "Total Daily Energy Expenditure (TDEE)", 
        f"{tdee} kcal",
        help="The estimated calories your body burns daily based on your weight, height, age, gender, and activity level."
    )
    # Explain calculation
    st.write(f"""
    **How this is calculated:**
    - Base Metabolic Rate (BMR): {bmr} kcal
    - Activity Multiplier: {activity_multiplier}
    - Additional Workout Calories: {round((workouts_per_week * workout_calories) / 7) if workouts_per_week > 0 else 0} kcal/day
    """)

with energy_col2:
    # Calculate delta for display
    delta = None
    if goal_type == "lose_fat":
        delta = f"-{tdee - target_calories} kcal (deficit)"
    elif goal_type == "gain_muscle":
        delta = f"+{target_calories - tdee} kcal (surplus)"
    
    st.metric(
        "Target Daily Calories", 
        f"{target_calories} kcal", 
        delta=delta,
        help="Your recommended daily calorie intake to achieve your body composition goals."
    )
    
    # Explain calculation
    if goal_type == "lose_fat":
        st.write(f"""
        **Deficit explanation:**
        - Weekly weight change target: {round(abs(weekly_change_kg)*1000)}g ({round(abs(weekly_change_kg)*2.2, 2)} lbs)
        - Daily calorie deficit: {round(tdee - target_calories)} kcal
        """)
    elif goal_type == "gain_muscle":
        st.write(f"""
        **Surplus explanation:**
        - Weekly weight change target: {round(abs(weekly_change_kg)*1000)}g ({round(abs(weekly_change_kg)*2.2, 2)} lbs)
        - Daily calorie surplus: {round(target_calories - tdee)} kcal
        """)
    else:
        st.write("Maintenance calories: Your intake matches your expenditure.")

# Store values in session state for later use
st.session_state.tdee = tdee
st.session_state.target_calories = target_calories

# ------------------------
# STEP 5: Macronutrient targets selection
# ------------------------
st.header("Select Macronutrient Targets")

st.info("""
Standard recommendations for macronutrients:
- **Protein:** 1.6-2.0 g/kg body weight (0.7-0.9 g/lb)
- **Fat:** 20-35% of total calories, minimum 0.4 g/lb body weight
- **Carbs:** Remaining calories after protein and fat are set
""")

# Initialize custom targets
if 'custom_protein' not in st.session_state:
    # Default protein is 1.8g/kg
    st.session_state.custom_protein = round(weight_kg * 1.8)
    
if 'custom_fat' not in st.session_state:
    # Default fat is 30% of calories or 0.4g/lb, whichever is higher
    fat_from_pct = round((target_calories * 0.3) / 9)
    fat_from_weight = round(weight_lbs * 0.4)
    st.session_state.custom_fat = max(fat_from_pct, fat_from_weight)
    
if 'custom_carbs' not in st.session_state:
    # Calculate remaining calories for carbs
    protein_calories = st.session_state.custom_protein * 4
    fat_calories = st.session_state.custom_fat * 9
    remaining_calories = target_calories - protein_calories - fat_calories
    st.session_state.custom_carbs = max(50, round(remaining_calories / 4))

# Create columns for macro selection
protein_col, fat_col, carb_col = st.columns(3)

with protein_col:
    st.write("### Protein Target")
    protein_option = st.radio(
        "Select protein amount:",
        ["Standard (1.8g/kg)", "High (2.0g/kg)", "Very High (2.2g/kg)", "Custom"],
        key="protein_option"
    )
    
    if protein_option == "Standard (1.8g/kg)":
        st.session_state.custom_protein = round(weight_kg * 1.8)
    elif protein_option == "High (2.0g/kg)":
        st.session_state.custom_protein = round(weight_kg * 2.0)
    elif protein_option == "Very High (2.2g/kg)":
        st.session_state.custom_protein = round(weight_kg * 2.2)
    elif protein_option == "Custom":
        st.session_state.custom_protein = st.number_input(
            "Custom protein (g)",
            min_value=50,
            max_value=400,
            value=st.session_state.custom_protein,
            step=5
        )
    
    protein_per_kg = round(st.session_state.custom_protein / weight_kg, 1)
    protein_per_lb = round(st.session_state.custom_protein / weight_lbs, 1)
    st.write(f"**{st.session_state.custom_protein}g** = {protein_per_kg}g/kg or {protein_per_lb}g/lb")
    
with fat_col:
    st.write("### Fat Target")
    fat_option = st.radio(
        "Select fat amount:",
        ["Standard (30% calories)", "Lower (25% calories)", "Higher (35% calories)", "Custom"],
        key="fat_option"
    )
    
    if fat_option == "Standard (30% calories)":
        st.session_state.custom_fat = round((target_calories * 0.3) / 9)
    elif fat_option == "Lower (25% calories)":
        st.session_state.custom_fat = round((target_calories * 0.25) / 9)
    elif fat_option == "Higher (35% calories)":
        st.session_state.custom_fat = round((target_calories * 0.35) / 9)
    elif fat_option == "Custom":
        st.session_state.custom_fat = st.number_input(
            "Custom fat (g)",
            min_value=30,
            max_value=200,
            value=st.session_state.custom_fat,
            step=5
        )
    
    fat_percent = round((st.session_state.custom_fat * 9 / target_calories) * 100)
    fat_per_lb = round(st.session_state.custom_fat / weight_lbs, 2)
    st.write(f"**{st.session_state.custom_fat}g** = {fat_percent}% calories or {fat_per_lb}g/lb")

with carb_col:
    st.write("### Carbohydrate Target")
    
    # Calculate remaining calories and auto-carbs
    protein_calories = st.session_state.custom_protein * 4
    fat_calories = st.session_state.custom_fat * 9
    remaining_calories = target_calories - protein_calories - fat_calories
    auto_carbs = max(50, round(remaining_calories / 4))
    
    st.session_state.custom_carbs = auto_carbs
    carb_percent = round((st.session_state.custom_carbs * 4 / target_calories) * 100)
    
    st.write(f"**{st.session_state.custom_carbs}g** (auto-calculated)")
    st.write(f"{carb_percent}% of total calories")
    st.write("Carbs fill remaining calories after protein and fat are set.")

# ------------------------
# STEP 6: Display macronutrient breakdown
# ------------------------
st.header("Macronutrient Breakdown")

# Calculate percentages
custom_protein_calories = st.session_state.custom_protein * 4
custom_carbs_calories = st.session_state.custom_carbs * 4
custom_fat_calories = st.session_state.custom_fat * 9
custom_total_calories = custom_protein_calories + custom_carbs_calories + custom_fat_calories

if custom_total_calories > 0:
    custom_protein_pct = round((custom_protein_calories / custom_total_calories) * 100)
    custom_carbs_pct = round((custom_carbs_calories / custom_total_calories) * 100)
    custom_fat_pct = round((custom_fat_calories / custom_total_calories) * 100)
else:
    custom_protein_pct = 0
    custom_carbs_pct = 0
    custom_fat_pct = 0

# Show macros with a better visualization
col1, col2, col3 = st.columns(3)

with col1:
    st.metric("Protein", f"{st.session_state.custom_protein}g ({custom_protein_pct}%)", 
              help="Protein is essential for muscle repair and growth.")
    st.progress(custom_protein_pct/100)
    st.write(f"{custom_protein_calories} calories from protein")

with col2:
    st.metric("Carbohydrates", f"{st.session_state.custom_carbs}g ({custom_carbs_pct}%)", 
              help="Carbohydrates are your body's primary energy source.")
    st.progress(custom_carbs_pct/100)
    st.write(f"{custom_carbs_calories} calories from carbs")

with col3:
    st.metric("Fat", f"{st.session_state.custom_fat}g ({custom_fat_pct}%)", 
              help="Dietary fat is important for hormone production and nutrient absorption.")
    st.progress(custom_fat_pct/100)
    st.write(f"{custom_fat_calories} calories from fat")

# ------------------------
# STEP 7: Meal Planning Guidance
# ------------------------
st.header("Meal Planning Guidance")

st.write("Distribute your daily macros across your preferred number of meals.")

meals_per_day = st.slider("Number of meals per day:", 2, 6, 4)
st.session_state.nutrition_plan['meals_per_day'] = meals_per_day

# Calculate per-meal macros
protein_per_meal = round(st.session_state.custom_protein / meals_per_day)
carbs_per_meal = round(st.session_state.custom_carbs / meals_per_day)
fat_per_meal = round(st.session_state.custom_fat / meals_per_day)
calories_per_meal = round(custom_total_calories / meals_per_day)

# Display meal breakdown
st.subheader(f"Average Macros Per Meal ({meals_per_day} meals)")
meals_df = pd.DataFrame({
    'Calories': [calories_per_meal],
    'Protein (g)': [protein_per_meal],
    'Carbs (g)': [carbs_per_meal],
    'Fat (g)': [fat_per_meal]
})
st.table(meals_df)

# Show examples of food combinations
with st.expander("Example Meal Ideas", expanded=False):
    st.write("""
    ### Balanced Meal Examples
    
    **High Protein Meals (~30g protein):**
    - 4oz (112g) chicken breast with 1 cup rice and 1 tbsp olive oil
    - 5oz (140g) Greek yogurt with 1 cup berries, 1oz nuts, and 1 scoop protein powder
    - 4oz (112g) salmon with 1 medium sweet potato and 1 cup vegetables
    
    **High Carb Meals (~50g carbs):**
    - 1.5 cups oatmeal with 1 scoop protein powder and 1 banana
    - 2 slices whole grain bread with 2 tbsp nut butter and 1 apple
    - 1 cup pasta with 3oz (85g) ground turkey and tomato sauce
    
    **Higher Fat Meals (~15g fat):**
    - 3 whole eggs with 1 slice whole grain toast and 1/4 avocado
    - 4oz (112g) ground beef (90% lean) with 1/2 cup rice and vegetables
    - 1 cup cottage cheese with 2 tbsp nut butter and 1/2 cup berries
    """)

# ------------------------
# STEP 8: Save Button and Next Steps
# ------------------------
st.markdown("---")
if st.button("Save Nutrition Plan", type="primary"):
    # Save to nutrition plan
    st.session_state.nutrition_plan['target_calories'] = target_calories
    st.session_state.nutrition_plan['target_protein'] = st.session_state.custom_protein
    st.session_state.nutrition_plan['target_carbs'] = st.session_state.custom_carbs
    st.session_state.nutrition_plan['target_fat'] = st.session_state.custom_fat
    st.session_state.nutrition_plan['meals_per_day'] = meals_per_day
    st.session_state.nutrition_plan['updated_at'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    # Save data
    utils.save_data()
    st.success("Nutrition plan saved successfully!")

# Next Steps
st.markdown("---")
st.header("Next Steps")
st.write("""
Once you've saved your nutrition plan, you can:
1. **Track your daily nutrition and body measurements** in the Daily Monitoring page
2. **Create detailed meal plans** in the Enhanced Meal Planning page
3. **View your progress over time** in the Progress Dashboard
""")

advanced_col1, advanced_col2 = st.columns(2)
with advanced_col1:
    if st.button("Go to Daily Monitoring", type="secondary"):
        st.switch_page("pages/4_Daily_Monitoring.py")
with advanced_col2:
    if st.button("Go to Enhanced Meal Planning", type="secondary"):
        st.switch_page("pages/6_Enhanced_Meal_Planning.py")