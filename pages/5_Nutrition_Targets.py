import streamlit as st
import pandas as pd
import numpy as np
import sys
import os
from datetime import datetime

# Add the root directory to the path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import utils

# Set page config
st.set_page_config(
    page_title="Fitomics - Nutrition Targets",
    page_icon="🎯",
    layout="wide"
)

# Load existing data
utils.load_data()

# Streamlit UI
st.title("🎯 Nutrition Targets")
st.markdown("Review and confirm your personalized nutrition targets based on your body composition goals, diet preferences, and weekly schedule.")

# Check if prerequisites are completed
if 'user_info' not in st.session_state or not st.session_state.user_info:
    st.warning("Please complete the Initial Setup first!")
    st.stop()

if 'targets_set' not in st.session_state or not st.session_state.targets_set:
    st.warning("Please complete the Body Composition Goals page first!")
    st.stop()

if 'diet_preferences' not in st.session_state:
    st.warning("Please complete the Diet Preferences page first!")
    st.stop()

if 'confirmed_weekly_schedule' not in st.session_state:
    st.warning("Please complete the Weekly Schedule page first!")
    st.stop()

# Display current user summary
st.markdown("### Your Profile Summary")
profile_col1, profile_col2, profile_col3 = st.columns(3)

with profile_col1:
    st.markdown("**Personal Info**")
    st.write(f"Age: {st.session_state.user_info.get('age', 'N/A')}")
    st.write(f"Gender: {st.session_state.user_info.get('gender', 'N/A')}")
    st.write(f"Weight: {st.session_state.user_info.get('weight_lbs', 0):.1f} lbs")
    st.write(f"Height: {st.session_state.user_info.get('height_ft', 0)}'{st.session_state.user_info.get('height_in', 0)}\"")

with profile_col2:
    st.markdown("**Body Composition Goals**")
    st.write(f"Current BF%: {st.session_state.get('body_fat_pct', 0):.1f}%")
    st.write(f"Target BF%: {st.session_state.get('target_bf', 0):.1f}%")
    st.write(f"Goal: {st.session_state.get('goal_type', 'N/A')}")
    st.write(f"Timeline: {st.session_state.get('timeline_weeks', 0)} weeks")

with profile_col3:
    st.markdown("**Activity & Preferences**")
    st.write(f"Activity Level: {st.session_state.get('activity_level', 'N/A')}")
    st.write(f"Meals per Day: {st.session_state.diet_preferences.get('meal_frequency', 3)}")
    st.write(f"Cooking Time: {st.session_state.diet_preferences.get('cooking_time_preference', 'N/A')}")
    dietary_restrictions = st.session_state.diet_preferences.get('dietary_restrictions', [])
    if dietary_restrictions and 'None' not in dietary_restrictions:
        st.write(f"Restrictions: {', '.join(dietary_restrictions[:2])}")

st.markdown("---")

# Calculate and display nutrition targets
st.markdown("### Calculated Nutrition Targets")

# Get base nutrition calculations
gender = st.session_state.user_info.get('gender', 'Male')
weight_kg = st.session_state.user_info.get('weight_kg', 70)
height_cm = st.session_state.user_info.get('height_cm', 175)
age = st.session_state.user_info.get('age', 30)
activity_level = st.session_state.get('activity_level', 'Moderately active')
goal_type = st.session_state.get('goal_type', 'Maintain weight')

# Calculate TDEE
tdee = utils.calculate_tdee(gender, weight_kg, height_cm, age, activity_level)

# Calculate target calories based on goal
target_calories = utils.calculate_target_calories(tdee, goal_type)

# Calculate macros
macros = utils.calculate_macros(target_calories, weight_kg, goal_type)

# Display base targets
st.markdown("#### Base Daily Targets")
base_col1, base_col2, base_col3, base_col4 = st.columns(4)

with base_col1:
    st.metric("Calories", f"{target_calories:,.0f}")
    
with base_col2:
    st.metric("Protein", f"{macros['protein']:.0f}g")
    
with base_col3:
    st.metric("Carbs", f"{macros['carbs']:.0f}g")
    
with base_col4:
    st.metric("Fat", f"{macros['fat']:.0f}g")

# Show macro percentages
protein_pct = (macros['protein'] * 4 / target_calories) * 100
carbs_pct = (macros['carbs'] * 4 / target_calories) * 100
fat_pct = (macros['fat'] * 9 / target_calories) * 100

st.markdown(f"**Macro Distribution:** Protein {protein_pct:.0f}% • Carbs {carbs_pct:.0f}% • Fat {fat_pct:.0f}%")

# Day-specific targets if available
if 'day_specific_nutrition' in st.session_state and st.session_state.day_specific_nutrition:
    st.markdown("#### Day-Specific Targets")
    st.markdown("Your targets vary by day based on your activity schedule:")
    
    # Create DataFrame for day-specific targets
    days_data = []
    days_of_week = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    
    for day in days_of_week:
        if day in st.session_state.day_specific_nutrition:
            day_nutrition = st.session_state.day_specific_nutrition[day]
            days_data.append({
                "Day": day,
                "Calories": f"{day_nutrition['target_calories']:,.0f}",
                "Protein": f"{day_nutrition['protein']:.0f}g",
                "Carbs": f"{day_nutrition['carbs']:.0f}g", 
                "Fat": f"{day_nutrition['fat']:.0f}g"
            })
    
    if days_data:
        df = pd.DataFrame(days_data)
        st.dataframe(df, use_container_width=True)
else:
    st.info("Day-specific targets will be generated based on your weekly schedule. The base targets above will be used for all days.")

st.markdown("---")

# Target customization section
st.markdown("### Customize Your Targets (Optional)")
st.markdown("You can adjust these targets if needed, or use the calculated values.")

customize_targets = st.checkbox("I want to customize my nutrition targets")

if customize_targets:
    custom_col1, custom_col2 = st.columns(2)
    
    with custom_col1:
        custom_calories = st.number_input(
            "Daily Calories",
            min_value=1200,
            max_value=5000,
            value=int(target_calories),
            step=50,
            help="Adjust based on your specific needs or preferences"
        )
        
        custom_protein = st.number_input(
            "Protein (g)",
            min_value=50,
            max_value=300,
            value=int(macros['protein']),
            step=5,
            help="Higher protein supports muscle building and satiety"
        )
    
    with custom_col2:
        custom_carbs = st.number_input(
            "Carbohydrates (g)",
            min_value=50,
            max_value=500,
            value=int(macros['carbs']),
            step=10,
            help="Carbs fuel your workouts and daily activities"
        )
        
        custom_fat = st.number_input(
            "Fat (g)",
            min_value=30,
            max_value=200,
            value=int(macros['fat']),
            step=5,
            help="Healthy fats support hormone production and satiety"
        )
    
    # Validate custom targets
    custom_total_calories = (custom_protein * 4) + (custom_carbs * 4) + (custom_fat * 9)
    calories_diff = abs(custom_total_calories - custom_calories)
    
    if calories_diff > 100:
        st.warning(f"Your macro calories ({custom_total_calories:.0f}) don't match your target calories ({custom_calories}). Difference: {calories_diff:.0f} calories.")
    
    # Update targets if customized
    final_calories = custom_calories
    final_protein = custom_protein
    final_carbs = custom_carbs
    final_fat = custom_fat
else:
    final_calories = target_calories
    final_protein = macros['protein']
    final_carbs = macros['carbs']
    final_fat = macros['fat']

st.markdown("---")

# Day-specific meal customization
st.markdown("### Day-Specific Meal Customization")
st.markdown("Customize meal count and timing for each day based on your training schedule and preferences.")

# Initialize day-specific meal settings if not exists
if 'day_specific_meals' not in st.session_state:
    st.session_state.day_specific_meals = {}

days_of_week = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

# Day selector for customization
customize_day = st.selectbox("Select day to customize meals:", days_of_week, key="meal_customize_day")

# Get day's schedule info
day_schedule = st.session_state.confirmed_weekly_schedule.get(customize_day, {})
day_workouts = day_schedule.get('workouts', [])
day_tdee = day_schedule.get('estimated_tdee', target_calories)

# Display day info
st.markdown(f"**{customize_day} Schedule:**")
if day_workouts:
    workout_info = ", ".join([f"{w.get('name', 'Workout')} ({w.get('intensity', 'Moderate')})" for w in day_workouts])
    st.write(f"🏋️ Workouts: {workout_info}")
else:
    st.write("🏋️ Rest Day")

st.write(f"🔥 Estimated TDEE: {day_tdee:.0f} calories")

# Get default meal settings from diet preferences
default_meal_count = st.session_state.diet_preferences.get('meal_frequency', 3)

# Get existing settings for this day or use defaults
day_meal_settings = st.session_state.day_specific_meals.get(customize_day, {
    'meal_count': default_meal_count,
    'use_custom_timing': False,
    'meal_times': []
})

meal_col1, meal_col2 = st.columns(2)

with meal_col1:
    # Meal count for this day
    day_meal_count = st.number_input(
        f"Number of meals on {customize_day}",
        min_value=2,
        max_value=8,
        value=day_meal_settings['meal_count'],
        key=f"meal_count_{customize_day}",
        help="Adjust based on your schedule and preferences for this day"
    )

with meal_col2:
    # Custom timing option
    use_custom_timing = st.checkbox(
        f"Custom meal timing for {customize_day}",
        value=day_meal_settings['use_custom_timing'],
        key=f"custom_timing_{customize_day}",
        help="Set specific meal times for this day"
    )

# Default meal time suggestions based on count
default_meal_times = {
    2: ["08:00", "18:00"],
    3: ["07:00", "12:00", "18:00"],
    4: ["07:00", "10:00", "13:00", "18:00"],
    5: ["07:00", "10:00", "13:00", "16:00", "19:00"],
    6: ["07:00", "10:00", "12:00", "15:00", "17:00", "20:00"],
    7: ["07:00", "09:00", "11:00", "13:00", "15:00", "17:00", "20:00"],
    8: ["07:00", "09:00", "11:00", "13:00", "15:00", "17:00", "19:00", "21:00"]
}

meal_times = default_meal_times.get(day_meal_count, ["07:00", "12:00", "18:00"])

if use_custom_timing:
    st.markdown(f"**Set meal times for {customize_day}:**")
    custom_times = []
    
    for i in range(day_meal_count):
        default_time = meal_times[i] if i < len(meal_times) else "12:00"
        if i < len(day_meal_settings.get('meal_times', [])):
            default_time = day_meal_settings['meal_times'][i]
            
        meal_time = st.time_input(
            f"Meal {i+1} time",
            value=pd.to_datetime(default_time).time(),
            key=f"meal_time_{customize_day}_{i}"
        )
        custom_times.append(meal_time.strftime("%H:%M"))
    
    meal_times = custom_times

# Update day-specific settings
st.session_state.day_specific_meals[customize_day] = {
    'meal_count': day_meal_count,
    'use_custom_timing': use_custom_timing,
    'meal_times': meal_times
}

# Show meal schedule preview for this day
st.markdown(f"**{customize_day} Meal Schedule Preview:**")
meal_names = ["Breakfast", "Mid-Morning", "Lunch", "Afternoon", "Dinner", "Evening", "Late Evening", "Night"]

day_meal_preview = []
for i, meal_time in enumerate(meal_times):
    meal_name = meal_names[i] if i < len(meal_names) else f"Meal {i+1}"
    day_meal_preview.append(f"{meal_time} - {meal_name}")

st.write(" • ".join(day_meal_preview))

if st.button(f"Apply to All Similar Days", key=f"apply_similar_{customize_day}"):
    # Apply to days with similar workout patterns
    similar_days = []
    current_workout_count = len(day_workouts)
    
    for day in days_of_week:
        if day != customize_day:
            day_data = st.session_state.confirmed_weekly_schedule.get(day, {})
            if len(day_data.get('workouts', [])) == current_workout_count:
                similar_days.append(day)
                st.session_state.day_specific_meals[day] = {
                    'meal_count': day_meal_count,
                    'use_custom_timing': use_custom_timing,
                    'meal_times': meal_times
                }
    
    if similar_days:
        st.success(f"Applied meal settings to similar days: {', '.join(similar_days)}")
    else:
        st.info("No similar days found to apply settings to.")

st.markdown("---")

# Meal distribution preview
st.markdown("### Overall Meal Distribution Preview")
st.markdown("Based on your meal preferences and day-specific customizations:")

# Show weekly meal distribution summary
weekly_meal_summary = []
for day in days_of_week:
    day_settings = st.session_state.day_specific_meals.get(day, {
        'meal_count': st.session_state.diet_preferences.get('meal_frequency', 3),
        'meal_times': []
    })
    
    meal_count = day_settings['meal_count']
    meal_times = day_settings.get('meal_times', [])
    
    if meal_times:
        times_display = ", ".join(meal_times)
    else:
        # Use default times
        default_times = default_meal_times.get(meal_count, ["07:00", "12:00", "18:00"])
        times_display = ", ".join(default_times)
    
    weekly_meal_summary.append({
        "Day": day,
        "Meals": meal_count,
        "Times": times_display
    })

weekly_df = pd.DataFrame(weekly_meal_summary)
st.dataframe(weekly_df, use_container_width=True)

# Example meal distribution for the selected day
selected_day_settings = st.session_state.day_specific_meals.get(customize_day, {
    'meal_count': st.session_state.diet_preferences.get('meal_frequency', 3)
})

example_meal_count = selected_day_settings['meal_count']

# Create meal distribution based on meal count
def get_meal_distribution(meal_count):
    if meal_count == 2:
        return ["Breakfast", "Dinner"], [0.4, 0.6]
    elif meal_count == 3:
        return ["Breakfast", "Lunch", "Dinner"], [0.25, 0.35, 0.4]
    elif meal_count == 4:
        return ["Breakfast", "Lunch", "Dinner", "Snack"], [0.25, 0.3, 0.35, 0.1]
    elif meal_count == 5:
        return ["Breakfast", "Mid-Morning", "Lunch", "Dinner", "Evening Snack"], [0.25, 0.1, 0.3, 0.25, 0.1]
    elif meal_count == 6:
        return ["Breakfast", "Mid-Morning", "Lunch", "Afternoon", "Dinner", "Evening"], [0.2, 0.1, 0.25, 0.15, 0.25, 0.05]
    elif meal_count == 7:
        return ["Breakfast", "Mid-Morning", "Lunch", "Afternoon", "Pre-Dinner", "Dinner", "Evening"], [0.2, 0.08, 0.22, 0.12, 0.08, 0.25, 0.05]
    else:  # 8 meals
        return ["Breakfast", "Mid-Morning", "Lunch", "Afternoon", "Pre-Dinner", "Dinner", "Evening", "Night"], [0.18, 0.07, 0.2, 0.1, 0.07, 0.23, 0.1, 0.05]

meal_names, meal_percentages = get_meal_distribution(example_meal_count)

st.markdown(f"**Example Distribution for {customize_day} ({example_meal_count} meals):**")

# Display meal breakdown
meal_data = []
for i, (meal_name, percentage) in enumerate(zip(meal_names, meal_percentages)):
    meal_calories = final_calories * percentage
    meal_protein = final_protein * percentage
    meal_carbs = final_carbs * percentage
    meal_fat = final_fat * percentage
    
    meal_data.append({
        "Meal": meal_name,
        "Calories": f"{meal_calories:.0f}",
        "Protein": f"{meal_protein:.0f}g",
        "Carbs": f"{meal_carbs:.0f}g",
        "Fat": f"{meal_fat:.0f}g"
    })

meal_df = pd.DataFrame(meal_data)
st.dataframe(meal_df, use_container_width=True)

st.markdown("---")

# Confirmation section
st.markdown("### Confirm Your Nutrition Targets")

# Store final targets in session state
st.session_state.final_nutrition_targets = {
    'calories': final_calories,
    'protein': final_protein,
    'carbs': final_carbs,
    'fat': final_fat,
    'meal_distribution': meal_data,
    'customized': customize_targets,
    'day_specific_meals': st.session_state.day_specific_meals,
    'weekly_meal_summary': weekly_meal_summary
}

confirm_col1, confirm_col2 = st.columns(2)

with confirm_col1:
    if st.button("✅ Confirm These Targets", type="primary", use_container_width=True):
        st.session_state.nutrition_targets_confirmed = True
        st.success("Nutrition targets confirmed! You can now proceed to meal planning.")
        
        # Save targets to file
        targets_file = 'data/nutrition_targets.json'
        os.makedirs('data', exist_ok=True)
        import json
        try:
            with open(targets_file, 'w') as f:
                json.dump(st.session_state.final_nutrition_targets, f, indent=2)
        except Exception as e:
            st.error(f"Error saving targets: {e}")

with confirm_col2:
    if st.button("🔄 Recalculate Targets", use_container_width=True):
        # Clear customization and recalculate
        st.rerun()

# Navigation guidance
if st.session_state.get('nutrition_targets_confirmed', False):
    st.markdown("---")
    st.markdown("### Next Steps")
    st.success("Your nutrition targets are confirmed! Choose your meal planning approach:")
    
    nav_col1, nav_col2 = st.columns(2)
    
    with nav_col1:
        st.markdown("""
        **🤖 AI Meal Planning**
        - Get personalized meal recommendations
        - Automatic recipe generation
        - Considers all your preferences
        - Perfect for busy schedules
        """)
    
    with nav_col2:
        st.markdown("""
        **🛠️ DIY Meal Planning**
        - Build meals manually
        - Full control over ingredients
        - Use food database search
        - Great for specific dietary needs
        """)
    
    st.markdown("Navigate using the sidebar to begin meal planning!")
else:
    st.info("Please confirm your nutrition targets above to proceed to meal planning.")