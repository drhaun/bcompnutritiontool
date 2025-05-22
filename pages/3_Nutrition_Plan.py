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

# Load brand logo
try:
    st.image("images/fitomicshorizontalgold.png", width=300)
except:
    pass

st.title("Nutrition Plan")
st.markdown("Based on your goals, here's your personalized nutrition plan.")

# Check if user has completed the initial setup and goals
if not st.session_state.user_info.get('gender') or not st.session_state.goal_info.get('goal_type'):
    st.warning("Please complete the Initial Setup and Body Composition Goals first!")
    st.stop()

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
target_weight_lbs = target_weight_kg * 2.20462
timeline_weeks = st.session_state.goal_info.get('timeline_weeks', 12)
target_bf_pct = st.session_state.goal_info.get('target_bf', body_fat_pct)

# Calculate weekly change rate
weekly_weight_pct = st.session_state.goal_info.get('weekly_weight_pct', 0.005)  # default 0.5%
weekly_fat_pct = st.session_state.goal_info.get('weekly_fat_pct', 0.7)  # default 70%
weekly_change_kg = (target_weight_kg - weight_kg) / timeline_weeks if timeline_weeks > 0 else 0

# Calculate TDEE
tdee = utils.calculate_tdee(
    gender, 
    weight_kg, 
    height_cm, 
    age, 
    activity_level, 
    workouts_per_week, 
    workout_calories
)
st.session_state.tdee = tdee

# Generate progress table to get correct calorie targets
start_date_str = datetime.now().strftime('%Y-%m-%d')
progress_table = utils.generate_detailed_progress_table(
    weight_lbs, body_fat_pct, target_weight_lbs, target_bf_pct,
    weekly_weight_pct, weekly_fat_pct, timeline_weeks, 
    start_date_str, tdee, gender, age, height_cm
)

# Get the first week's calorie target from the progress table
if not progress_table.empty and 'Daily Energy Target (kcal)' in progress_table.columns:
    target_calories = progress_table.iloc[0]['Daily Energy Target (kcal)']
else:
    # Fallback calculation if progress table doesn't have the data
    target_calories = utils.calculate_target_calories(tdee, goal_type, abs(weekly_change_kg))

# Calculate macros with standardized targets
# Standard protein is 1.6-2.0 g/kg
standard_protein = round(weight_kg * 1.8)  # Using 1.8g/kg as a default middle value

# Standard fat is 30% of calories or at least 0.4g/lb
fat_from_pct = round((target_calories * 0.3) / 9)  # 30% of calories
fat_from_weight = round(weight_lbs * 0.4)  # 0.4g/lb
standard_fat = max(fat_from_pct, fat_from_weight)

# Calculate remaining calories for carbs
protein_calories = standard_protein * 4
fat_calories = standard_fat * 9
carb_calories = target_calories - protein_calories - fat_calories
standard_carbs = max(50, round(carb_calories / 4))  # Ensure minimum carbs

# Create macros dictionary
macros = {
    'protein': standard_protein,
    'carbs': standard_carbs,
    'fat': standard_fat
}

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
    
    if goal_type == "lose_fat":
        delta = f"-{abs(calorie_deficit)} kcal (deficit)"
    elif goal_type == "gain_muscle":
        delta = f"+{calorie_surplus} kcal (surplus)"
    else:
        delta = None
        
    st.metric("Target Daily Calories", f"{st.session_state.nutrition_plan['target_calories']} kcal", delta=delta,
              help="This is your recommended daily calorie intake to achieve your goals.")

# Show macros selection
st.subheader("Select Macronutrient Targets")

st.info("""
Based on your body composition goals, here are your recommended macronutrient targets. 
Standard protein is 1.6-2.0 g/kg, standard fat is 30% of calories or at least 0.4 g/lb of body weight.
""")

# Initialize custom targets with current plan values
if 'custom_protein' not in st.session_state:
    st.session_state.custom_protein = st.session_state.nutrition_plan['target_protein']
if 'custom_fat' not in st.session_state:
    st.session_state.custom_fat = st.session_state.nutrition_plan['target_fat']
if 'custom_carbs' not in st.session_state:
    st.session_state.custom_carbs = st.session_state.nutrition_plan['target_carbs']

# Create columns for selecting targets
protein_col, fat_col, carb_col = st.columns(3)

with protein_col:
    st.write("#### Protein Target")
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
    st.write("#### Fat Target")
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
    st.write("#### Carbohydrate Target")
    
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

# Display macronutrient visualization
st.subheader("Macronutrient Breakdown")

# Calculate current percentages
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

# Show progress table preview for energy targets over time
with st.expander("View Projected Weekly Energy Targets"):
    if not progress_table.empty:
        # Create a simplified version for display
        display_cols = ['Week', 'Date', 'Ending Weight (lbs)', 'Ending Body Fat %', 'Daily Energy Target (kcal)']
        if all(col in progress_table.columns for col in display_cols):
            simplified_table = progress_table[display_cols].copy()
            simplified_table = simplified_table.rename(columns={
                'Ending Weight (lbs)': 'Weight (lbs)',
                'Ending Body Fat %': 'Body Fat %',
                'Daily Energy Target (kcal)': 'Energy Target (kcal)'
            })
            st.dataframe(simplified_table, use_container_width=True)
            
            st.info("These are your projected weekly energy targets to achieve your body composition goals. Your macro targets will adjust as your weight and energy needs change.")
    else:
        st.info("Complete your body composition goals first to see projected weekly energy targets.")

# Create a section to customize the nutrition plan
# Add a button to save the custom macros
st.markdown("---")
if st.button("Save Customized Nutrition Plan"):
    # Update nutrition plan with customized values from the new UI
    st.session_state.nutrition_plan['target_protein'] = st.session_state.custom_protein
    st.session_state.nutrition_plan['target_carbs'] = st.session_state.custom_carbs
    st.session_state.nutrition_plan['target_fat'] = st.session_state.custom_fat
    st.session_state.nutrition_plan['updated_at'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    # Save data
    utils.save_data()
    st.success("Customized nutrition plan saved successfully!")
    
    # Rerun to update UI
    st.rerun()

# Protein customization section
with st.expander("Customize Protein Target", expanded=True):
    # Current protein per kg/lb info
    protein_per_kg = round(st.session_state.nutrition_plan['target_protein'] / weight_kg, 1)
    protein_per_lb = round(protein_per_kg / 2.20462, 1)
    
    st.write(f"Your current protein target is **{st.session_state.nutrition_plan['target_protein']}g** " +
             f"({protein_per_kg} g/kg or {protein_per_lb} g/lb of body weight).")
    
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
    
    # Protein selection
    protein_option = st.selectbox(
        "Select Protein Target",
        options=["Standard", "Moderate High", "High", "Very High", "Custom"],
        index=0,
        help="Choose your preferred protein intake level"
    )
    
    if protein_option == "Custom":
        custom_protein = st.number_input(
            "Custom Protein Target (g)",
            min_value=min(50, st.session_state.nutrition_plan['target_protein'] - 50),
            max_value=st.session_state.nutrition_plan['target_protein'] + 100,
            value=st.session_state.nutrition_plan['target_protein'],
            step=5
        )
    else:
        # Adjust protein based on selection
        if protein_option == "Standard":
            custom_protein = macros['protein']  # Original calculated value
        elif protein_option == "Moderate High":
            custom_protein = round(weight_kg * 1.8)  # 1.8g per kg
        elif protein_option == "High":
            custom_protein = round(weight_kg * 2.2)  # 2.2g per kg
        elif protein_option == "Very High":
            custom_protein = round(weight_kg * 2.5)  # 2.5g per kg

# Fat customization section
with st.expander("Customize Fat Target", expanded=True):
    fat_pct = round((st.session_state.nutrition_plan['target_fat'] * 9) / st.session_state.nutrition_plan['target_calories'] * 100)
    st.write(f"Your current fat target is **{st.session_state.nutrition_plan['target_fat']}g** "
             f"({fat_pct}% of total calories).")
    
    # Fat recommendation table
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
    
    # Fat selection
    fat_option = st.selectbox(
        "Select Fat Target",
        options=["Standard", "Lower", "Higher", "Custom"],
        index=0,
        help="Choose your preferred fat intake level"
    )
    
    if fat_option == "Custom":
        custom_fat = st.number_input(
            "Custom Fat Target (g)",
            min_value=max(30, st.session_state.nutrition_plan['target_fat'] - 30),
            max_value=st.session_state.nutrition_plan['target_fat'] + 50,
            value=st.session_state.nutrition_plan['target_fat'],
            step=5
        )
    else:
        # Adjust fat based on selection
        if fat_option == "Standard":
            custom_fat = macros['fat']  # Original calculated value
        elif fat_option == "Lower":
            # Aim for about 20% of calories from fat
            custom_fat = round((target_calories * 0.2) / 9)
        elif fat_option == "Higher":
            # Aim for about 35% of calories from fat
            custom_fat = round((target_calories * 0.35) / 9)

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
    
    # Use the modern rerun function
    st.rerun()

# Meal Planning Guidance
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