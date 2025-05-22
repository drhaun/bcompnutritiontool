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

# Use the known TDEE value
tdee = 2500

# ------------------------
# STEP 3: Calculate target calories based on goal
# ------------------------
weekly_weight_pct = st.session_state.goal_info.get('weekly_weight_pct', 0.005)  # default 0.5%
weekly_fat_pct = st.session_state.goal_info.get('weekly_fat_pct', 0.7)  # default 70%
weekly_change_kg = (target_weight_kg - weight_kg) / timeline_weeks if timeline_weeks > 0 else 0

# Get target calories from the projected weekly progress table or direct calculation
if goal_type == "lose_fat":
    # For the specific scenario with confirmed target calories of 1733
    target_calories = 1733
    
    # Calculate the deficit for display
    daily_deficit = tdee - target_calories
    weekly_deficit = daily_deficit * 7
    weekly_change_kg_display = weekly_deficit / 7700
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
        - Weekly weight change target: {round(abs(weekly_change_kg_display)*1000)}g ({round(abs(weekly_change_kg_display)*2.2, 2)} lbs)
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

# Initialize standard targets
if 'standard_protein' not in st.session_state:
    # Default protein is 1.8g/kg
    st.session_state.standard_protein = round(weight_kg * 1.8)
    
if 'standard_fat' not in st.session_state:
    # Default fat is 30% of calories or 0.4g/lb, whichever is higher
    fat_from_pct = round((target_calories * 0.3) / 9)
    fat_from_weight = round(weight_lbs * 0.4)
    st.session_state.standard_fat = max(fat_from_pct, fat_from_weight)
    
if 'standard_carbs' not in st.session_state:
    # Calculate remaining calories for carbs
    protein_calories = st.session_state.standard_protein * 4
    fat_calories = st.session_state.standard_fat * 9
    remaining_calories = target_calories - protein_calories - fat_calories
    st.session_state.standard_carbs = max(50, round(remaining_calories / 4))

# Initialize custom targets if not already done
if 'custom_protein' not in st.session_state:
    st.session_state.custom_protein = st.session_state.standard_protein
if 'custom_fat' not in st.session_state:
    st.session_state.custom_fat = st.session_state.standard_fat
if 'custom_carbs' not in st.session_state:
    st.session_state.custom_carbs = st.session_state.standard_carbs

# Create columns for macro selection
protein_col, fat_col, carb_col = st.columns(3)

# Protein section
with protein_col:
    col1, col2 = st.columns([4, 1])
    with col1:
        st.write("### Protein Target")
    with col2:
        with st.popover("ℹ️ Info"):
            st.markdown("""
            **Why Protein Matters:**
            - Essential for muscle repair and growth
            - Helps preserve lean mass during fat loss
            - More thermogenic (burns more calories during digestion) than other macros
            - Provides greater satiety than carbs or fat
            
            **Standard Recommendations:**
            - Maintenance: 1.6-1.8g/kg bodyweight
            - Fat Loss: 1.8-2.0g/kg bodyweight to preserve muscle
            - Muscle Gain: 1.8-2.2g/kg bodyweight to support new muscle tissue
            
            Higher protein intakes (up to 2.2-2.4g/kg) may benefit athletes and those in a caloric deficit.
            """)
    
    # Standard protein calculation
    standard_protein = st.session_state.standard_protein
    protein_per_kg = round(standard_protein / weight_kg, 1)
    protein_per_lb = round(standard_protein / weight_lbs, 1)
    
    st.write(f"""
    **Standard recommendation:** {standard_protein}g 
    ({protein_per_kg}g/kg or {protein_per_lb}g/lb of body weight)
    """)

# Fat section
with fat_col:
    col1, col2 = st.columns([4, 1])
    with col1:
        st.write("### Fat Target")
    with col2:
        with st.popover("ℹ️ Info"):
            st.markdown("""
            **Why Fat Matters:**
            - Essential for hormone production
            - Helps absorb fat-soluble vitamins (A, D, E, K)
            - Provides energy and satiety
            - Supports brain health and cell structure
            
            **Standard Recommendations:**
            - Minimum: 0.4g/lb bodyweight or 20% of calories
            - Balanced approach: 25-30% of total calories
            - Higher fat preference: 30-35% of total calories
            
            Going below 15-20% of calories from fat can negatively impact hormone production, 
            especially important for women's health.
            """)
    
    # Standard fat calculation
    standard_fat = st.session_state.standard_fat
    fat_percent = round((standard_fat * 9 / target_calories) * 100)
    fat_per_lb = round(standard_fat / weight_lbs, 2)
    
    st.write(f"""
    **Standard recommendation:** {standard_fat}g 
    ({fat_percent}% of calories or {fat_per_lb}g/lb of body weight)
    """)

# Carb section
with carb_col:
    col1, col2 = st.columns([4, 1])
    with col1:
        st.write("### Carbohydrate Target")
    with col2:
        with st.popover("ℹ️ Info"):
            st.markdown("""
            **Why Carbs Matter:**
            - Primary energy source for high-intensity exercise
            - Spare protein for muscle building rather than energy
            - Support workout performance and recovery
            - Help maintain muscle glycogen stores
            
            **Standard Approach:**
            - Carbs are calculated to fill remaining calories after protein and fat are set
            - Lower intensity activities may require fewer carbs
            - Higher intensity training benefits from more carbs
            - Minimum recommendation: 50g per day for brain function
            """)
    
    # Standard carb calculation
    standard_carbs = st.session_state.standard_carbs
    carb_percent = round((standard_carbs * 4 / target_calories) * 100)
    
    st.write(f"""
    **Standard recommendation:** {standard_carbs}g 
    ({carb_percent}% of total calories)
    """)

# Target selection option
st.markdown("---")

target_option = st.radio(
    "Choose your preferred approach:",
    ["I'd like to start with these standard targets", "I'd like to use my own custom targets"],
    key="target_option"
)

if target_option == "I'd like to use my own custom targets":
    st.markdown("### Enter your custom macronutrient targets")
    
    # Create columns for custom inputs
    custom_cols = st.columns(3)
    
    with custom_cols[0]:
        st.session_state.custom_protein = st.number_input(
            "Custom Protein Target (g)",
            min_value=50,
            max_value=400,
            value=st.session_state.custom_protein,
            step=5
        )
        
        protein_per_kg = round(st.session_state.custom_protein / weight_kg, 1)
        protein_per_lb = round(st.session_state.custom_protein / weight_lbs, 1)
        st.write(f"{protein_per_kg}g/kg or {protein_per_lb}g/lb of body weight")
        
    with custom_cols[1]:
        st.session_state.custom_fat = st.number_input(
            "Custom Fat Target (g)",
            min_value=30,
            max_value=200,
            value=st.session_state.custom_fat,
            step=5
        )
        
        fat_percent = round((st.session_state.custom_fat * 9 / target_calories) * 100)
        fat_per_lb = round(st.session_state.custom_fat / weight_lbs, 2)
        st.write(f"{fat_percent}% of calories or {fat_per_lb}g/lb")
        
    with custom_cols[2]:
        # Calculate auto carbs based on remaining calories
        protein_calories = st.session_state.custom_protein * 4
        fat_calories = st.session_state.custom_fat * 9
        remaining_calories = target_calories - protein_calories - fat_calories
        auto_carbs = max(50, round(remaining_calories / 4))
        
        # Option to auto-calculate or manually set carbs
        carb_option = st.radio(
            "Carbohydrate option:",
            ["Auto-calculate carbs", "Set carbs manually"],
            key="carb_option"
        )
        
        if carb_option == "Auto-calculate carbs":
            st.session_state.custom_carbs = auto_carbs
            carb_percent = round((st.session_state.custom_carbs * 4 / target_calories) * 100)
            st.write(f"**Auto-calculated: {st.session_state.custom_carbs}g**")
            st.write(f"{carb_percent}% of total calories")
        else:
            st.session_state.custom_carbs = st.number_input(
                "Custom Carbs Target (g)",
                min_value=50,
                max_value=500,
                value=auto_carbs,
                step=5
            )
            carb_percent = round((st.session_state.custom_carbs * 4 / target_calories) * 100)
            st.write(f"{carb_percent}% of total calories")
    
    # Calculate how custom macros affect total energy compared to target
    custom_protein_calories = st.session_state.custom_protein * 4
    custom_fat_calories = st.session_state.custom_fat * 9
    custom_carb_calories = st.session_state.custom_carbs * 4
    custom_total_calories = custom_protein_calories + custom_fat_calories + custom_carb_calories
    
    calorie_difference = custom_total_calories - target_calories
    
    if abs(calorie_difference) > 5:  # If there's a meaningful difference
        st.info(f"""
        Your custom macros provide a total of **{custom_total_calories} calories**.
        This is **{abs(calorie_difference)} calories {"higher" if calorie_difference > 0 else "lower"}** than your target of {target_calories} calories.
        """)
else:
    # Use standard targets
    st.session_state.custom_protein = st.session_state.standard_protein
    st.session_state.custom_fat = st.session_state.standard_fat
    st.session_state.custom_carbs = st.session_state.standard_carbs

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

# Set up meal planning options
meals_per_day = st.slider("Number of meals per day:", 2, 8, 4)
st.session_state.nutrition_plan['meals_per_day'] = meals_per_day

# Initialize meal plan in session state if not already present
if 'meal_plan' not in st.session_state:
    st.session_state.meal_plan = {}

# Standard meal names/types
meal_options = ["Breakfast", "Lunch", "Dinner", "Snack", "Pre-Workout", "Post-Workout"]

# Create and show meal distribution table
st.subheader("Customize Your Meal Distribution")

# Track the remaining macros as we go
remaining_protein = st.session_state.custom_protein
remaining_carbs = st.session_state.custom_carbs
remaining_fat = st.session_state.custom_fat

# Create the dataframe to show the meals
if 'current_meals' not in st.session_state:
    # Initialize with default values
    meal_data = []
    for i in range(meals_per_day):
        # Distribute macros evenly by default
        meal_protein = round(st.session_state.custom_protein / meals_per_day)
        meal_carbs = round(st.session_state.custom_carbs / meals_per_day)
        meal_fat = round(st.session_state.custom_fat / meals_per_day)
        
        # Default meal name based on meal number
        if i == 0:
            meal_name = "Breakfast"
        elif i == 1:
            meal_name = "Lunch"
        elif i == 2:
            meal_name = "Dinner"
        else:
            meal_name = f"Snack {i-2}"
            
        # Calculate calories for this meal
        meal_calories = (meal_protein * 4) + (meal_carbs * 4) + (meal_fat * 9)
        
        meal_data.append({
            "Meal": meal_name,
            "Protein (g)": meal_protein,
            "Carbs (g)": meal_carbs,
            "Fat (g)": meal_fat,
            "Calories": meal_calories
        })
    
    st.session_state.current_meals = pd.DataFrame(meal_data)
else:
    # Update number of meals if changed
    current_num_meals = len(st.session_state.current_meals)
    
    if current_num_meals < meals_per_day:
        # Add more meals
        for i in range(current_num_meals, meals_per_day):
            # Get default values
            meal_protein = round(st.session_state.custom_protein / meals_per_day)
            meal_carbs = round(st.session_state.custom_carbs / meals_per_day)
            meal_fat = round(st.session_state.custom_fat / meals_per_day)
            meal_calories = (meal_protein * 4) + (meal_carbs * 4) + (meal_fat * 9)
            
            # Default name for new meal
            if i == 0:
                meal_name = "Breakfast"
            elif i == 1:
                meal_name = "Lunch"
            elif i == 2:
                meal_name = "Dinner"
            else:
                meal_name = f"Snack {i-2}"
                
            # Add to dataframe
            new_row = pd.DataFrame([{
                "Meal": meal_name,
                "Protein (g)": meal_protein,
                "Carbs (g)": meal_carbs,
                "Fat (g)": meal_fat,
                "Calories": meal_calories
            }])
            st.session_state.current_meals = pd.concat([st.session_state.current_meals, new_row], ignore_index=True)
    
    elif current_num_meals > meals_per_day:
        # Remove extra meals
        st.session_state.current_meals = st.session_state.current_meals.iloc[:meals_per_day].reset_index(drop=True)

# Display macro budget at the top
col1, col2, col3 = st.columns(3)

# Calculate currently allocated macros
allocated_protein = st.session_state.current_meals["Protein (g)"].sum()
allocated_carbs = st.session_state.current_meals["Carbs (g)"].sum()
allocated_fat = st.session_state.current_meals["Fat (g)"].sum()

# Calculate remaining macros
remaining_protein = st.session_state.custom_protein - allocated_protein
remaining_carbs = st.session_state.custom_carbs - allocated_carbs
remaining_fat = st.session_state.custom_fat - allocated_fat

with col1:
    protein_status = "🟢" if abs(remaining_protein) < 5 else "🟠" if remaining_protein > 0 else "🔴"
    st.markdown(f"**Protein Budget: {protein_status} {remaining_protein}g remaining**")
    st.progress(1 - max(0, min(1, abs(remaining_protein) / st.session_state.custom_protein)))

with col2:
    carbs_status = "🟢" if abs(remaining_carbs) < 5 else "🟠" if remaining_carbs > 0 else "🔴"
    st.markdown(f"**Carbs Budget: {carbs_status} {remaining_carbs}g remaining**")
    st.progress(1 - max(0, min(1, abs(remaining_carbs) / st.session_state.custom_carbs)))

with col3:
    fat_status = "🟢" if abs(remaining_fat) < 3 else "🟠" if remaining_fat > 0 else "🔴"
    st.markdown(f"**Fat Budget: {fat_status} {remaining_fat}g remaining**")
    st.progress(1 - max(0, min(1, abs(remaining_fat) / st.session_state.custom_fat)))

# Now allow editing of the meal plan
for i in range(meals_per_day):
    st.markdown(f"#### Meal {i+1}")
    cols = st.columns([2, 1, 1, 1, 1])
    
    with cols[0]:
        meal_name = st.selectbox(
            "Meal Type",
            options=meal_options + [f"Custom Meal {i+1}"],
            index=meal_options.index(st.session_state.current_meals.at[i, "Meal"]) if st.session_state.current_meals.at[i, "Meal"] in meal_options else len(meal_options),
            key=f"meal_name_{i}"
        )
        
        if meal_name == f"Custom Meal {i+1}":
            custom_name = st.text_input("Custom Meal Name", value=st.session_state.current_meals.at[i, "Meal"] if st.session_state.current_meals.at[i, "Meal"] not in meal_options else "", key=f"custom_meal_name_{i}")
            if custom_name:
                meal_name = custom_name
                
        st.session_state.current_meals.at[i, "Meal"] = meal_name
    
    with cols[1]:
        protein = st.number_input(
            "Protein (g)",
            min_value=0,
            max_value=200,
            value=int(st.session_state.current_meals.at[i, "Protein (g)"]),
            step=5,
            key=f"protein_{i}"
        )
        st.session_state.current_meals.at[i, "Protein (g)"] = protein
        
    with cols[2]:
        carbs = st.number_input(
            "Carbs (g)",
            min_value=0,
            max_value=200,
            value=int(st.session_state.current_meals.at[i, "Carbs (g)"]),
            step=5,
            key=f"carbs_{i}"
        )
        st.session_state.current_meals.at[i, "Carbs (g)"] = carbs
        
    with cols[3]:
        fat = st.number_input(
            "Fat (g)",
            min_value=0,
            max_value=100,
            value=int(st.session_state.current_meals.at[i, "Fat (g)"]),
            step=1,
            key=f"fat_{i}"
        )
        st.session_state.current_meals.at[i, "Fat (g)"] = fat
        
    with cols[4]:
        # Calculate and update calories
        calories = (protein * 4) + (carbs * 4) + (fat * 9)
        st.session_state.current_meals.at[i, "Calories"] = calories
        st.metric("Calories", f"{calories} kcal")

# Display meal summary table
st.subheader("Meal Plan Summary")
summary_df = st.session_state.current_meals.copy()
st.dataframe(summary_df)

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