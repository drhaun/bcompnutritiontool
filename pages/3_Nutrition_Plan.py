import streamlit as st
import pandas as pd
import numpy as np
from datetime import datetime
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

# Check if user has completed the initial setup and goals
if not st.session_state.user_info['gender'] or not st.session_state.goal_info.get('goal_type'):
    st.warning("Please complete the Initial Setup and Body Composition Goals first!")
    st.stop()

st.title("Nutrition Plan")
st.markdown("Based on your goals, here's your personalized nutrition plan.")

# Calculate or recalculate TDEE and nutrition targets
# Get user information
gender = st.session_state.user_info['gender']
weight_kg = st.session_state.user_info['weight_kg']
weight_lbs = weight_kg * 2.20462
height_cm = st.session_state.user_info['height_cm']
age = st.session_state.user_info['age']
activity_level = st.session_state.user_info['activity_level']
workouts_per_week = st.session_state.user_info.get('workouts_per_week', 0)
workout_calories = st.session_state.user_info.get('workout_calories', 0)
body_fat_pct = st.session_state.user_info.get('body_fat_percentage', 20)
fat_free_mass_kg = weight_kg * (1 - body_fat_pct/100)
fat_free_mass_lbs = fat_free_mass_kg * 2.20462

# Get goal information
goal_type = st.session_state.goal_info['goal_type']
target_weight_kg = st.session_state.goal_info.get('target_weight_kg', weight_kg)
timeline_weeks = st.session_state.goal_info.get('timeline_weeks', 12)

# Calculate weekly change rate
weekly_change = (target_weight_kg - weight_kg) / timeline_weeks

# Calculate TDEE with workout calories
tdee = utils.calculate_tdee(
    gender, 
    weight_kg, 
    height_cm, 
    age, 
    activity_level, 
    workouts_per_week, 
    workout_calories
)

# Calculate target calories based on goal
target_calories = utils.calculate_target_calories(tdee, goal_type, abs(weekly_change))

# Calculate macros
macros = utils.calculate_macros(target_calories, weight_kg, goal_type)

# If this is the first time or we want to update the plan with calculated values
if not st.session_state.nutrition_plan.get('target_calories'):
    # Set nutrition plan
    st.session_state.nutrition_plan = {
        'tdee': round(tdee),
        'target_calories': round(target_calories),
        'target_protein': macros['protein'],
        'target_carbs': macros['carbs'],
        'target_fat': macros['fat'],
        'weekly_adjustments': []
    }
    
    # Save data
    utils.save_data()

# Display current nutrition plan
st.subheader("Your Calculated Nutrition Targets")

# Show TDEE and target calories with explanation
col1, col2 = st.columns(2)
with col1:
    st.metric("Total Daily Energy Expenditure (TDEE)", f"{st.session_state.nutrition_plan.get('tdee', 0)} kcal", 
              help="This is an estimate of how many calories you burn daily based on your body stats and activity level.")
with col2:
    calorie_deficit = st.session_state.nutrition_plan.get('tdee', 0) - st.session_state.nutrition_plan['target_calories']
    calorie_surplus = st.session_state.nutrition_plan['target_calories'] - st.session_state.nutrition_plan.get('tdee', 0)
    
    if st.session_state.goal_info['goal_type'] == "lose_fat":
        delta = f"-{abs(calorie_deficit)} kcal (deficit)"
    elif st.session_state.goal_info['goal_type'] == "gain_muscle":
        delta = f"+{calorie_surplus} kcal (surplus)"
    else:
        delta = None
        
    st.metric("Target Daily Calories", f"{st.session_state.nutrition_plan['target_calories']} kcal", delta=delta,
              help="This is your recommended daily calorie intake to achieve your goals.")

# Show macros with progress bars
st.subheader("Current Macronutrient Targets")

# Calculate percentages
protein_calories = st.session_state.nutrition_plan['target_protein'] * 4
carb_calories = st.session_state.nutrition_plan['target_carbs'] * 4
fat_calories = st.session_state.nutrition_plan['target_fat'] * 9
total_calories = protein_calories + carb_calories + fat_calories

if total_calories > 0:
    protein_pct = round((protein_calories / total_calories) * 100)
    carb_pct = round((carb_calories / total_calories) * 100)
    fat_pct = round((fat_calories / total_calories) * 100)
else:
    protein_pct = 0
    carb_pct = 0
    fat_pct = 0

# Show macros with a better visualization
col1, col2, col3 = st.columns(3)

with col1:
    st.metric("Protein", f"{st.session_state.nutrition_plan['target_protein']}g ({protein_pct}%)", 
              help="Protein is essential for muscle repair and growth.")
    st.progress(protein_pct/100)
    st.write(f"{protein_calories} calories from protein")

with col2:
    st.metric("Carbohydrates", f"{st.session_state.nutrition_plan['target_carbs']}g ({carb_pct}%)", 
              help="Carbohydrates are your body's primary energy source.")
    st.progress(carb_pct/100)
    st.write(f"{carb_calories} calories from carbs")

with col3:
    st.metric("Fat", f"{st.session_state.nutrition_plan['target_fat']}g ({fat_pct}%)", 
              help="Dietary fat is important for hormone production and nutrient absorption.")
    st.progress(fat_pct/100)
    st.write(f"{fat_calories} calories from fat")

# Create a section to customize the nutrition plan
st.markdown("---")
st.subheader("Customize Your Nutrition Plan")
st.write("Adjust your macronutrient targets based on your preferences:")

# Protein customization section
with st.expander("Customize Protein Target", expanded=True):
    # Current protein per kg/lb info
    protein_per_kg = round(st.session_state.nutrition_plan['target_protein'] / weight_kg, 1)
    protein_per_lb = round(protein_per_kg / 2.20462, 1)
    
    st.write(f"Your current protein target is **{st.session_state.nutrition_plan['target_protein']}g** " +
             f"({protein_per_kg} g/kg or {protein_per_lb} g/lb of body weight).")
    
    # Protein multiplier selection with dynamic fields
    st.write("##### Select your protein target using bodyweight multiplier:")
    
    # Create columns for the bodyweight multiplier fields
    col1, col2 = st.columns(2)
    
    with col1:
        # Add "g per kg" multiplier with visual immediate result
        protein_multiplier_kg = st.slider(
            "Protein (g per kg of bodyweight)",
            min_value=0.8,
            max_value=3.0,
            value=protein_per_kg,
            step=0.1,
            help="Select your protein target as a multiplier of your bodyweight in kg"
        )
        calculated_protein_kg = round(protein_multiplier_kg * weight_kg)
        st.write(f"→ **{calculated_protein_kg}g** total protein ({round(protein_multiplier_kg * weight_kg * 4)} calories)")
    
    with col2:
        # Add "g per lb" multiplier with visual immediate result
        protein_multiplier_lb = st.slider(
            "Protein (g per lb of bodyweight)",
            min_value=0.4,
            max_value=1.4,
            value=protein_per_lb,
            step=0.05,
            help="Select your protein target as a multiplier of your bodyweight in lbs"
        )
        calculated_protein_lb = round(protein_multiplier_lb * weight_lbs)
        st.write(f"→ **{calculated_protein_lb}g** total protein ({round(protein_multiplier_lb * weight_lbs * 4)} calories)")
    
    # Show common recommendations
    st.write("##### Common recommendations by activity level:")
    
    # Protein recommendation table
    protein_rec_df = pd.DataFrame({
        'Activity Level': ['Sedentary', 'Light Activity', 'Moderate Activity', 'High Activity', 'Athlete'],
        'Protein Range (g/kg)': ['0.8-1.0', '1.0-1.2', '1.2-1.6', '1.6-2.0', '2.0-2.5'],
        'Protein Range (g/lb)': ['0.4-0.45', '0.45-0.55', '0.55-0.7', '0.7-0.9', '0.9-1.1'],
        'Description': [
            'Minimal physical activity',
            'Light exercise 1-3 days/week',
            'Moderate exercise 3-5 days/week',
            'Hard exercise 6-7 days/week',
            'Multiple workouts per day or competitive training'
        ]
    })
    
    st.dataframe(protein_rec_df, hide_index=True, use_container_width=True)
    
    # Choose which protein calculation to use (from kg or lb multiplier, or custom input)
    protein_source = st.radio(
        "Choose protein calculation method:",
        options=["Use g/kg multiplier", "Use g/lb multiplier", "Enter custom value"],
        horizontal=True,
        index=0
    )
    
    if protein_source == "Use g/kg multiplier":
        custom_protein = calculated_protein_kg
    elif protein_source == "Use g/lb multiplier":
        custom_protein = calculated_protein_lb
    else:  # Custom value
        custom_protein = st.number_input(
            "Custom Protein Target (g)",
            min_value=min(50, st.session_state.nutrition_plan['target_protein'] - 50),
            max_value=st.session_state.nutrition_plan['target_protein'] + 100,
            value=st.session_state.nutrition_plan['target_protein'],
            step=5
        )

# Fat customization section
with st.expander("Customize Fat Target", expanded=True):
    fat_pct = round((st.session_state.nutrition_plan['target_fat'] * 9) / st.session_state.nutrition_plan['target_calories'] * 100)
    fat_per_kg = round(st.session_state.nutrition_plan['target_fat'] / weight_kg, 1)
    
    st.write(f"Your current fat target is **{st.session_state.nutrition_plan['target_fat']}g** "
             f"({fat_pct}% of total calories or {fat_per_kg}g/kg of bodyweight).")
    
    # Fat multipliers and percentage options
    st.write("##### Select your fat target:")
    
    tab1, tab2 = st.tabs(["Percentage of Calories", "Multiplier of Bodyweight"])
    
    with tab1:
        # By percentage of calories
        fat_percentage = st.slider(
            "Fat (percentage of total calories)",
            min_value=15,
            max_value=45,
            value=fat_pct,
            step=5,
            help="Select fat as a percentage of total calories"
        )
        calculated_fat_pct = round((target_calories * fat_percentage / 100) / 9)
        st.write(f"→ **{calculated_fat_pct}g** total fat ({round(calculated_fat_pct * 9)} calories, {fat_percentage}% of total)")
    
    with tab2:
        # By multiplier of bodyweight
        col1, col2 = st.columns(2)
        
        with col1:
            # g per kg multiplier
            fat_multiplier_kg = st.slider(
                "Fat (g per kg of bodyweight)",
                min_value=0.5,
                max_value=2.0,
                value=fat_per_kg,
                step=0.1,
                help="Select your fat target as a multiplier of your bodyweight in kg"
            )
            calculated_fat_kg = round(fat_multiplier_kg * weight_kg)
            fat_percent_of_calories = round((calculated_fat_kg * 9) / target_calories * 100)
            st.write(f"→ **{calculated_fat_kg}g** total fat ({round(calculated_fat_kg * 9)} calories, {fat_percent_of_calories}% of total)")
        
        with col2:
            # g per lb multiplier
            fat_multiplier_lb = st.slider(
                "Fat (g per lb of bodyweight)",
                min_value=0.2,
                max_value=1.0,
                value=round(fat_per_kg / 2.20462, 1),
                step=0.05,
                help="Select your fat target as a multiplier of your bodyweight in lbs"
            )
            calculated_fat_lb = round(fat_multiplier_lb * weight_lbs)
            fat_lb_percent_of_calories = round((calculated_fat_lb * 9) / target_calories * 100)
            st.write(f"→ **{calculated_fat_lb}g** total fat ({round(calculated_fat_lb * 9)} calories, {fat_lb_percent_of_calories}% of total)")
    
    # Fat recommendation table
    st.write("##### Common fat intake recommendations:")
    fat_rec_df = pd.DataFrame({
        'Fat Percentage': ['15-20%', '20-25%', '25-30%', '30-35%', '>35%'],
        'Description': [
            'Low fat diet - may reduce testosterone in men, affect hormones in women',
            'Moderate-low fat diet - good for short term fat loss phases',
            'Balanced fat intake - good for most people',
            'Moderate-high fat diet - may help those with higher fat needs',
            'High fat diet - typically for specific therapeutic reasons'
        ]
    })
    
    st.dataframe(fat_rec_df, hide_index=True, use_container_width=True)
    
    # Choose which fat calculation to use
    fat_source = st.radio(
        "Choose fat calculation method:",
        options=["Use percentage of calories", "Use g/kg multiplier", "Use g/lb multiplier", "Enter custom value"],
        horizontal=True,
        index=0
    )
    
    if fat_source == "Use percentage of calories":
        custom_fat = calculated_fat_pct
    elif fat_source == "Use g/kg multiplier":
        custom_fat = calculated_fat_kg
    elif fat_source == "Use g/lb multiplier":
        custom_fat = calculated_fat_lb
    else:  # Custom value
        custom_fat = st.number_input(
            "Custom Fat Target (g)",
            min_value=max(30, st.session_state.nutrition_plan['target_fat'] - 30),
            max_value=st.session_state.nutrition_plan['target_fat'] + 50,
            value=st.session_state.nutrition_plan['target_fat'],
            step=5
        )

# Calculate remaining calories for carbs
protein_cals = custom_protein * 4
fat_cals = custom_fat * 9
remaining_cals = target_calories - protein_cals - fat_cals
auto_carbs = max(50, round(remaining_cals / 4))  # Ensure minimum carbs

# Carb customization section
with st.expander("Customize Carbohydrate Target", expanded=True):
    carb_pct = round((st.session_state.nutrition_plan['target_carbs'] * 4) / st.session_state.nutrition_plan['target_calories'] * 100)
    st.write(f"Your current carb target is **{st.session_state.nutrition_plan['target_carbs']}g** "
             f"({carb_pct}% of total calories).")
    
    # Show auto-calculated carbs based on protein and fat selections
    auto_carb_pct = round((auto_carbs * 4) / target_calories * 100)
    st.write(f"Based on your protein and fat selections, your carbs would be automatically set to **{auto_carbs}g** ({auto_carb_pct}% of calories).")
    
    # Option to override carbs
    override_carbs = st.checkbox("Override automatic carb calculation", value=False)
    
    if override_carbs:
        custom_carbs = st.number_input(
            "Custom Carbohydrate Target (g)",
            min_value=50,
            max_value=500,
            value=auto_carbs,
            step=5
        )
        
        # Calculate new calorie total with custom carbs
        new_calories = protein_cals + (custom_carbs * 4) + fat_cals
        calorie_diff = new_calories - target_calories
        
        if abs(calorie_diff) > 50:
            if calorie_diff > 0:
                st.warning(f"⚠️ Your custom carb target will increase your total calories by {calorie_diff} kcal above your target.")
            else:
                st.warning(f"⚠️ Your custom carb target will decrease your total calories by {abs(calorie_diff)} kcal below your target.")
    else:
        custom_carbs = auto_carbs

# Calculate the final adjusted plan
adjusted_calories = (custom_protein * 4) + (custom_carbs * 4) + (custom_fat * 9)
adj_protein_pct = round((custom_protein * 4) / adjusted_calories * 100)
adj_carb_pct = round((custom_carbs * 4) / adjusted_calories * 100)
adj_fat_pct = round((custom_fat * 9) / adjusted_calories * 100)

# Show Summary of Adjusted Plan
st.markdown("---")
st.subheader("Summary of Adjusted Nutrition Plan")

# Compare current plan with adjusted plan
col1, col2 = st.columns(2)

with col1:
    st.write("**Current Plan**")
    st.write(f"Calories: {st.session_state.nutrition_plan['target_calories']} kcal")
    st.write(f"Protein: {st.session_state.nutrition_plan['target_protein']}g ({protein_pct}%)")
    st.write(f"Carbs: {st.session_state.nutrition_plan['target_carbs']}g ({carb_pct}%)")
    st.write(f"Fat: {st.session_state.nutrition_plan['target_fat']}g ({fat_pct}%)")

with col2:
    st.write("**Adjusted Plan**")
    st.write(f"Calories: {adjusted_calories} kcal")
    st.write(f"Protein: {custom_protein}g ({adj_protein_pct}%)")
    st.write(f"Carbs: {custom_carbs}g ({adj_carb_pct}%)")
    st.write(f"Fat: {custom_fat}g ({adj_fat_pct}%)")

# Create Plan Button
if st.button("Create Nutrition Plan", type="primary"):
    # Update the nutrition plan
    st.session_state.nutrition_plan['target_calories'] = adjusted_calories
    st.session_state.nutrition_plan['target_protein'] = custom_protein
    st.session_state.nutrition_plan['target_carbs'] = custom_carbs
    st.session_state.nutrition_plan['target_fat'] = custom_fat
    
    # Save the data
    utils.save_data()
    
    st.success("Nutrition plan created successfully! You can now proceed to the Meal Planning page to organize your meals.")
    
    # Try to use the appropriate rerun function
    try:
        st.rerun()
    except:
        st.warning("Please refresh the page to see your updated plan.")

# Meal Planning Guidance - Keeping this from the original page as requested
st.markdown("---")
st.subheader("Meal Planning Guidance")

num_meals = st.slider("How many meals do you prefer per day?", 2, 6, 3)

st.write("Here's how you could distribute your macros throughout the day:")

# Calculate meal distribution
meal_data = []
protein_per_meal = round(st.session_state.nutrition_plan['target_protein'] / num_meals)
carbs_per_meal = round(st.session_state.nutrition_plan['target_carbs'] / num_meals)
fat_per_meal = round(st.session_state.nutrition_plan['target_fat'] / num_meals)
calories_per_meal = round(st.session_state.nutrition_plan['target_calories'] / num_meals)

# Create a meal plan table
for i in range(1, num_meals + 1):
    meal_data.append({
        'Meal': f"Meal {i}",
        'Protein (g)': protein_per_meal,
        'Carbs (g)': carbs_per_meal,
        'Fat (g)': fat_per_meal,
        'Calories': calories_per_meal
    })

# Add the total row
meal_data.append({
    'Meal': 'Total',
    'Protein (g)': st.session_state.nutrition_plan['target_protein'],
    'Carbs (g)': st.session_state.nutrition_plan['target_carbs'],
    'Fat (g)': st.session_state.nutrition_plan['target_fat'],
    'Calories': st.session_state.nutrition_plan['target_calories']
})

meal_df = pd.DataFrame(meal_data)
st.table(meal_df)

st.write("**Note:** This is a simple equal distribution. For more advanced meal planning with personalized timing, "
         "food preferences, and pre/post workout nutrition, visit the Enhanced Meal Planning page.")