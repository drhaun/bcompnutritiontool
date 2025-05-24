import streamlit as st
import pandas as pd
import datetime
import copy
import json
import os
import sys
import numpy as np

# Add parent directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import utils

# Set page title and layout
st.set_page_config(
    page_title="Fitomics - Weekly Schedule & Nutrition",
    page_icon="📅",
    layout="wide"
)

# Initialize session state for schedule if needed
if 'weekly_schedule' not in st.session_state:
    days_of_week = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    
    # Create empty schedule for each day
    day_template = {
        "meals": [],
        "workouts": [],
        "work": []  # This includes all other activities
    }
    
    days_dict = {}
    for day in days_of_week:
        days_dict[day] = copy.deepcopy(day_template)
    
    st.session_state.weekly_schedule = {
        "wake_time": "06:00",
        "bed_time": "22:00",
        "days": days_dict
    }

# Initialize session state for activity popup
if 'add_activity_popup' not in st.session_state:
    st.session_state.add_activity_popup = False
    st.session_state.add_activity_hour = None
    st.session_state.add_activity_day = None

# Helper function to convert time string to decimal hours
def time_to_hours(time_str):
    if not time_str:
        return 0
    
    hours, minutes = map(int, time_str.split(":"))
    return hours + minutes / 60

# Check if the user is coming from previous pages
if 'user_info' not in st.session_state or 'goal_info' not in st.session_state:
    st.warning("Please complete the Initial Setup and Body Composition Goals first!")
    st.stop()

# Header and description
st.title("Weekly Schedule & Nutrition Planning")
st.write("Plan your meals, workouts, activities, and set your nutritional targets for the week.")

# Remove duplicate check

# ------------------------------
# STEP 1: NUTRITION TARGETS
# ------------------------------
st.header("Nutrition Targets")

# Get user information from session state
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

# Calculate TDEE
bmr = utils.calculate_bmr(gender, weight_kg, height_cm, age)
activity_multiplier = utils.get_activity_multiplier(activity_level)
tdee = round(bmr * activity_multiplier)

# Add workout calories if applicable
if workouts_per_week > 0 and workout_calories > 0:
    workout_contribution = (workouts_per_week * workout_calories) / 7
    tdee = round(tdee + workout_contribution)

# Calculate target calories based on goal
weekly_weight_pct = st.session_state.goal_info.get('weekly_weight_pct', 0.005)  # default 0.5%
weekly_fat_pct = st.session_state.goal_info.get('weekly_fat_pct', 0.7)  # default 70%
weekly_change_kg = (target_weight_kg - weight_kg) / timeline_weeks if timeline_weeks > 0 else 0

# Set target calories based on goal
if goal_type == "lose_fat":
    # Calculate deficit based on weekly fat loss target
    weekly_deficit = abs(weekly_change_kg) * 7700  # Approx. calories in 1kg of fat
    daily_deficit = weekly_deficit / 7
    target_calories = round(tdee - daily_deficit)
    # Ensure minimum healthy calories
    target_calories = max(target_calories, 1200 if gender == "Female" else 1500)
elif goal_type == "gain_muscle":
    # Calculate surplus based on weekly weight gain target
    weekly_surplus = abs(weekly_change_kg) * 7700 * 0.5  # Muscle requires fewer calories than fat
    daily_surplus = weekly_surplus / 7
    target_calories = round(tdee + daily_surplus)
else:  # maintain
    target_calories = tdee

# Display TDEE and target calories
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
        weekly_change_kg_display = weekly_change_kg
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

# ------------------------------
# STEP 2: MACRONUTRIENT TARGETS
# ------------------------------
st.subheader("Macronutrient Targets")

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
        st.write("#### Protein Target")
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
    
    # Custom protein input
    custom_protein = st.number_input(
        "Custom protein target (g):",
        min_value=50,
        max_value=500,
        value=st.session_state.custom_protein,
        step=5,
        key="protein_input"
    )
    st.session_state.custom_protein = custom_protein

# Fat section
with fat_col:
    col1, col2 = st.columns([4, 1])
    with col1:
        st.write("#### Fat Target")
    with col2:
        with st.popover("ℹ️ Info"):
            st.markdown("""
            **Why Fat Matters:**
            - Essential for hormone production
            - Necessary for vitamin absorption
            - Provides essential fatty acids
            - Supports cell membrane health
            - Creates feeling of fullness
            
            **Standard Recommendations:**
            - Minimum: 0.3-0.4g/lb of body weight
            - Typical Range: 25-35% of total calories
            - Sufficient fat intake is crucial for hormonal health, especially for women
            
            Very low-fat diets (<20% of calories) can lead to decreased testosterone and disrupted hormonal function.
            """)
    
    # Standard fat calculation
    standard_fat = st.session_state.standard_fat
    fat_calories = standard_fat * 9
    fat_pct = round((fat_calories / target_calories) * 100)
    fat_per_lb = round(standard_fat / weight_lbs, 1)
    
    st.write(f"""
    **Standard recommendation:** {standard_fat}g 
    ({fat_pct}% of calories or {fat_per_lb}g/lb of body weight)
    """)
    
    # Custom fat input
    custom_fat = st.number_input(
        "Custom fat target (g):",
        min_value=30,
        max_value=250,
        value=st.session_state.custom_fat,
        step=5,
        key="fat_input"
    )
    st.session_state.custom_fat = custom_fat

# Carbs section
with carb_col:
    col1, col2 = st.columns([4, 1])
    with col1:
        st.write("#### Carbohydrate Target")
    with col2:
        with st.popover("ℹ️ Info"):
            st.markdown("""
            **Why Carbs Matter:**
            - Primary fuel source for high-intensity exercise
            - Spare protein for muscle-building instead of energy
            - Replenish muscle glycogen
            - Support hormonal function
            - Often most enjoyable macro (diet adherence)
            
            **Standard Approach:**
            - Calculate protein and fat targets first
            - Assign remaining calories to carbohydrates
            - Adjust based on personal preference and response
            
            High-volume training typically benefits from higher carbohydrate intake.
            """)
    
    # Standard carb calculation
    standard_carbs = st.session_state.standard_carbs
    carb_calories = standard_carbs * 4
    carb_pct = round((carb_calories / target_calories) * 100)
    
    st.write(f"""
    **Standard recommendation:** {standard_carbs}g 
    ({carb_pct}% of calories)
    """)
    
    # Custom carb input
    custom_carbs = st.number_input(
        "Custom carbohydrate target (g):",
        min_value=50,
        max_value=700,
        value=st.session_state.custom_carbs,
        step=5,
        key="carb_input"
    )
    st.session_state.custom_carbs = custom_carbs

# Calculate totals
protein_cals = st.session_state.custom_protein * 4
fat_cals = st.session_state.custom_fat * 9
carb_cals = st.session_state.custom_carbs * 4
total_cals = protein_cals + fat_cals + carb_cals

# Display macronutrient breakdown
st.subheader("Macronutrient Breakdown")

# Create a summary table
macro_data = {
    "Macronutrient": ["Protein", "Fat", "Carbohydrates", "Total"],
    "Grams": [
        st.session_state.custom_protein,
        st.session_state.custom_fat,
        st.session_state.custom_carbs,
        st.session_state.custom_protein + st.session_state.custom_fat + st.session_state.custom_carbs
    ],
    "Calories": [
        protein_cals,
        fat_cals,
        carb_cals,
        total_cals
    ],
    "% of Calories": [
        round((protein_cals / total_cals) * 100) if total_cals > 0 else 0,
        round((fat_cals / total_cals) * 100) if total_cals > 0 else 0,
        round((carb_cals / total_cals) * 100) if total_cals > 0 else 0,
        100
    ]
}

# Display as a DataFrame
macro_df = pd.DataFrame(macro_data)
st.dataframe(macro_df, use_container_width=True, hide_index=True)

# Show warning if calories don't match target
calorie_diff = abs(total_cals - target_calories)
if calorie_diff > 50:
    if total_cals > target_calories:
        st.warning(f"Your selected macros provide {calorie_diff} calories above your target. Consider adjusting.")
    else:
        st.warning(f"Your selected macros provide {calorie_diff} calories below your target. Consider adjusting.")
else:
    st.success("Your macros closely match your calorie target.")

# Save nutrition plan to session state
if 'nutrition_plan' not in st.session_state:
    st.session_state.nutrition_plan = {}

st.session_state.nutrition_plan = {
    "target_calories": target_calories,
    "protein": st.session_state.custom_protein,
    "fat": st.session_state.custom_fat,
    "carbs": st.session_state.custom_carbs,
    "protein_pct": round((protein_cals / total_cals) * 100) if total_cals > 0 else 0,
    "fat_pct": round((fat_cals / total_cals) * 100) if total_cals > 0 else 0,
    "carbs_pct": round((carb_cals / total_cals) * 100) if total_cals > 0 else 0,
    "total_calories": total_cals
}

# ------------------------------
# STEP 3: WEEKLY SCHEDULE
# ------------------------------
st.header("Weekly Schedule")
st.write("Plan your meals, workouts, and other activities throughout the week.")

# Define activity types and templates
activity_types = {
    "Meals": [
        {"name": "Breakfast", "color": "#FF9F1C", "icon": "🍽️"},
        {"name": "Lunch", "color": "#FF9F1C", "icon": "🍽️"},
        {"name": "Dinner", "color": "#FF9F1C", "icon": "🍽️"},
        {"name": "Snack", "color": "#FF9F1C", "icon": "🍽️"},
        {"name": "Pre-workout", "color": "#FF9F1C", "icon": "🍽️"},
        {"name": "Post-workout", "color": "#FF9F1C", "icon": "🍽️"},
    ],
    "Workouts": [
        {"name": "Strength", "duration": 60, "color": "#2EC4B6", "icon": "💪"},
        {"name": "Cardio", "duration": 45, "color": "#2EC4B6", "icon": "🏃"},
        {"name": "HIIT", "duration": 30, "color": "#2EC4B6", "icon": "⚡"},
        {"name": "Yoga", "duration": 45, "color": "#2EC4B6", "icon": "🧘"},
    ],
    "Activities": [
        {"name": "Work", "duration": 480, "color": "#E71D36", "icon": "💼"},
        {"name": "Study", "duration": 120, "color": "#E71D36", "icon": "📚"},
        {"name": "Family", "duration": 120, "color": "#E71D36", "icon": "👨‍👩‍👧‍👦"},
        {"name": "Free Time", "duration": 60, "color": "#E71D36", "icon": "🎮"},
        {"name": "Sleep", "duration": 480, "color": "#E71D36", "icon": "😴"},
        {"name": "Wake Up", "duration": 30, "color": "#E71D36", "icon": "⏰"},
    ]
}

# Quick template patterns
template_options = {
    "3 Meals": [
        {"type": "meal", "name": "Breakfast", "time": "07:30"},
        {"type": "meal", "name": "Lunch", "time": "12:30"}, 
        {"type": "meal", "name": "Dinner", "time": "18:30"}
    ],
    "5 Meals": [
        {"type": "meal", "name": "Breakfast", "time": "07:00"},
        {"type": "meal", "name": "Snack", "time": "10:00"},
        {"type": "meal", "name": "Lunch", "time": "13:00"},
        {"type": "meal", "name": "Snack", "time": "16:00"},
        {"type": "meal", "name": "Dinner", "time": "19:00"}
    ],
    "Workout Day": [
        {"type": "meal", "name": "Breakfast", "time": "07:00"},
        {"type": "meal", "name": "Pre-workout", "time": "15:30"},
        {"type": "workout", "start": "16:30", "end": "17:30", "type": "Strength", "intensity": "Moderate"},
        {"type": "meal", "name": "Post-workout", "time": "18:00"},
        {"type": "meal", "name": "Dinner", "time": "20:00"}
    ],
    "Work Day": [
        {"type": "activity", "type": "Wake Up", "start": "06:30", "end": "07:00"},
        {"type": "meal", "name": "Breakfast", "time": "07:15"},
        {"type": "activity", "type": "Work", "start": "09:00", "end": "17:00"},
        {"type": "meal", "name": "Lunch", "time": "12:30"},
        {"type": "workout", "start": "18:00", "end": "19:00", "type": "Workout", "intensity": "Moderate"},
        {"type": "meal", "name": "Dinner", "time": "19:30"},
        {"type": "activity", "type": "Sleep", "start": "22:30", "end": "06:30"}
    ]
}

# Day selection and templates in the header
days_of_week = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
col1, col2 = st.columns(2)

with col1:
    selected_day = st.selectbox("Select day:", days_of_week, format_func=lambda x: f"{x}")
    day_data = st.session_state.weekly_schedule['days'][selected_day]

with col2:
    template_name = st.selectbox("Apply template:", ["None"] + list(template_options.keys()))
    
    if template_name != "None" and st.button("Apply Template"):
        # Clear existing day data
        st.session_state.weekly_schedule['days'][selected_day]['meals'] = []
        st.session_state.weekly_schedule['days'][selected_day]['workouts'] = [] 
        st.session_state.weekly_schedule['days'][selected_day]['work'] = []
        
        # Add template items
        for item in template_options[template_name]:
            if "type" in item and item["type"] == "meal":
                st.session_state.weekly_schedule['days'][selected_day]['meals'].append({
                    "name": item["name"],
                    "time": item["time"]
                })
            elif "type" in item and item["type"] == "workout":
                st.session_state.weekly_schedule['days'][selected_day]['workouts'].append({
                    "type": item["type"],
                    "start": item["start"],
                    "end": item["end"],
                    "intensity": item.get("intensity", "Moderate")
                })
            elif "type" in item:  # Activity
                st.session_state.weekly_schedule['days'][selected_day]['work'].append({
                    "type": item["type"],
                    "start": item["start"],
                    "end": item["end"]
                })
        
        st.success(f"Applied template '{template_name}' to {selected_day}")
        st.rerun()

# Create timeline for selected day
st.write(f"### {selected_day}'s Schedule")

# Prepare list of activities for the day
min_hour = 6  # Start at 6am
max_hour = 23  # End at 11pm
all_activities = []

# Add meals to timeline
for idx, meal in enumerate(day_data['meals']):
    hour = int(time_to_hours(meal['time']))
    if min_hour <= hour <= max_hour:
        all_activities.append({
            "type": "meal",
            "name": meal['name'],
            "time": meal['time'],
            "hour": hour,
            "idx": idx,
            "color": "#FF9F1C",
            "icon": "🍽️"
        })

# Add workouts to timeline
for idx, workout in enumerate(day_data['workouts']):
    start_hour = int(time_to_hours(workout['start']))
    end_hour = int(time_to_hours(workout['end']))
    
    # Handle overnight workouts
    if end_hour < start_hour:
        end_hour += 24
        
    if min_hour <= start_hour <= max_hour or min_hour <= end_hour <= max_hour:
        all_activities.append({
            "type": "workout",
            "name": workout['type'],
            "time": workout['start'],
            "start": workout['start'],
            "end": workout['end'],
            "hour": start_hour,
            "end_hour": end_hour,
            "idx": idx,
            "color": "#2EC4B6",
            "icon": "💪"
        })

# Add other activities to timeline
for idx, activity in enumerate(day_data['work']):
    start_hour = int(time_to_hours(activity['start']))
    end_hour = int(time_to_hours(activity['end']))
    
    # Handle overnight activities
    if end_hour < start_hour:
        end_hour += 24
        
    if min_hour <= start_hour <= max_hour or min_hour <= end_hour <= max_hour:
        all_activities.append({
            "type": "activity",
            "name": activity['type'],
            "time": activity['start'],
            "start": activity['start'],
            "end": activity['end'],
            "hour": start_hour,
            "end_hour": end_hour,
            "idx": idx,
            "color": "#E71D36",
            "icon": "📆"
        })

# Sort activities by time
all_activities.sort(key=lambda x: x['hour'])

# Display the timeline
for hour in range(min_hour, max_hour + 1):
    # Find activities in this hour
    hour_activities = [a for a in all_activities 
                     if a['hour'] <= hour < a.get('end_hour', a['hour'] + 1)]
    
    # Create a row for this hour
    st.markdown(f"**{hour:02d}:00**")
    
    if hour_activities:
        # Display activities in this hour
        for activity in hour_activities:
            with st.container(border=True):
                cols = st.columns([0.9, 0.1])
                
                # Show activity details
                if activity['hour'] == hour:
                    # Activity starts in this hour
                    if activity['type'] == 'meal':
                        cols[0].write(f"{activity['icon']} {activity['name']} ({activity['time']})")
                    else:
                        cols[0].write(f"{activity['icon']} {activity['name']} ({activity['start']}-{activity['end']})")
                        
                    # Add delete button
                    if cols[1].button("❌", key=f"delete_{activity['type']}_{activity['idx']}_{hour}"):
                        if activity['type'] == 'meal':
                            st.session_state.weekly_schedule['days'][selected_day]['meals'].pop(activity['idx'])
                        elif activity['type'] == 'workout':
                            st.session_state.weekly_schedule['days'][selected_day]['workouts'].pop(activity['idx'])
                        else:
                            st.session_state.weekly_schedule['days'][selected_day]['work'].pop(activity['idx'])
                        st.success(f"Removed activity")
                        st.rerun()
                else:
                    # Activity continues from previous hour
                    cols[0].write(f"{activity['icon']} {activity['name']} (continued)")
    else:
        # Empty time slot - show add button
        if st.button(f"+ Add activity at {hour:02d}:00", key=f"add_{hour}"):
            st.session_state.add_activity_popup = True
            st.session_state.add_activity_hour = hour
            st.session_state.add_activity_day = selected_day
            st.rerun()
    
    # Add divider between hours
    st.markdown("---")

# Show popup for adding activity
if st.session_state.add_activity_popup:
    with st.container(border=True):
        popup_hour = st.session_state.add_activity_hour
        popup_day = st.session_state.add_activity_day
        
        st.subheader(f"Add to {popup_day} at {popup_hour:02d}:00")
        
        # Create tabs for different activity types
        add_tabs = st.tabs(["Meal", "Workout", "Other Activity"])
        
        # Meal tab
        with add_tabs[0]:
            meal_name = st.selectbox(
                "Meal type:",
                [meal["name"] for meal in activity_types["Meals"]],
                key="popup_meal_name"
            )
            
            if st.button("Add Meal", key="add_meal_btn"):
                st.session_state.weekly_schedule['days'][popup_day]['meals'].append({
                    "name": meal_name,
                    "time": f"{popup_hour:02d}:00"
                })
                st.success(f"Added {meal_name} at {popup_hour:02d}:00")
                st.session_state.add_activity_popup = False
                st.rerun()
        
        # Workout tab
        with add_tabs[1]:
            workout_name = st.selectbox(
                "Workout type:",
                [workout["name"] for workout in activity_types["Workouts"]],
                key="popup_workout_name"
            )
            
            # Find duration for selected workout
            duration = 60
            for workout in activity_types["Workouts"]:
                if workout["name"] == workout_name:
                    duration = workout["duration"]
                    break
            
            # Calculate end time
            end_hour = popup_hour + (duration // 60)
            end_minute = duration % 60
            end_time = f"{end_hour % 24:02d}:{end_minute:02d}"
            
            st.write(f"Duration: {duration} minutes (ends at {end_time})")
            
            if st.button("Add Workout", key="add_workout_btn"):
                st.session_state.weekly_schedule['days'][popup_day]['workouts'].append({
                    "type": workout_name,
                    "start": f"{popup_hour:02d}:00",
                    "end": end_time,
                    "intensity": "Moderate"
                })
                st.success(f"Added {workout_name} at {popup_hour:02d}:00")
                st.session_state.add_activity_popup = False
                st.rerun()
        
        # Other Activity tab
        with add_tabs[2]:
            activity_name = st.selectbox(
                "Activity type:",
                [activity["name"] for activity in activity_types["Activities"]],
                key="popup_activity_name"
            )
            
            # Find default duration
            duration_hours = 1
            for activity in activity_types["Activities"]:
                if activity["name"] == activity_name:
                    duration_hours = activity["duration"] // 60
                    break
            
            # Let user customize duration
            duration_hours = st.slider(
                "Duration (hours):", 
                min_value=0.5, 
                max_value=8.0, 
                value=float(duration_hours), 
                step=0.5
            )
            
            # Calculate end time
            duration_minutes = int(duration_hours * 60)
            end_hour = popup_hour + (duration_minutes // 60)
            end_minute = duration_minutes % 60
            end_time = f"{end_hour % 24:02d}:{end_minute:02d}"
            
            st.write(f"End time: {end_time}")
            
            if st.button("Add Activity", key="add_activity_btn"):
                st.session_state.weekly_schedule['days'][popup_day]['work'].append({
                    "type": activity_name,
                    "start": f"{popup_hour:02d}:00",
                    "end": end_time
                })
                st.success(f"Added {activity_name} at {popup_hour:02d}:00")
                st.session_state.add_activity_popup = False
                st.rerun()
        
        # Cancel button
        if st.button("Cancel", key="popup_cancel"):
            st.session_state.add_activity_popup = False
            st.rerun()

# Copy schedule to other days
st.write("### Copy Schedule to Other Days")
copy_cols = st.columns([2, 1])

with copy_cols[0]:
    target_day = st.selectbox(
        "Copy current schedule to:",
        [d for d in days_of_week if d != selected_day]
    )
    
with copy_cols[1]:
    if st.button("Copy Schedule"):
        # Deep copy all schedule items
        st.session_state.weekly_schedule['days'][target_day]['meals'] = copy.deepcopy(
            st.session_state.weekly_schedule['days'][selected_day]['meals']
        )
        st.session_state.weekly_schedule['days'][target_day]['workouts'] = copy.deepcopy(
            st.session_state.weekly_schedule['days'][selected_day]['workouts']
        )
        st.session_state.weekly_schedule['days'][target_day]['work'] = copy.deepcopy(
            st.session_state.weekly_schedule['days'][selected_day]['work']
        )
        
        st.success(f"Copied schedule from {selected_day} to {target_day}")
        st.rerun()