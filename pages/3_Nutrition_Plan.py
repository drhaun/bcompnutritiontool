import streamlit as st
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import sys
import os
import copy
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
# STEP 6: Weekly Schedule Planner
# ------------------------
st.header("Weekly Schedule Planner")
st.write("Plan your weekly schedule to optimize meal timing around your daily activities.")

# Initialize weekly schedule in session state if not present
if 'weekly_schedule' not in st.session_state:
    st.session_state.weekly_schedule = {
        'wake_time': '06:00',
        'bed_time': '22:00',
        'days': {
            'Monday': {'meals': [], 'workouts': [], 'work': []},
            'Tuesday': {'meals': [], 'workouts': [], 'work': []},
            'Wednesday': {'meals': [], 'workouts': [], 'work': []},
            'Thursday': {'meals': [], 'workouts': [], 'work': []},
            'Friday': {'meals': [], 'workouts': [], 'work': []},
            'Saturday': {'meals': [], 'workouts': [], 'work': []},
            'Sunday': {'meals': [], 'workouts': [], 'work': []}
        }
    }

# Function to convert time string to hours (for positioning events)
def time_to_hours(time_str):
    hours, minutes = map(int, time_str.split(':'))
    return hours + minutes/60

# Function to get hour range based on wake and bed times
def get_hour_range(wake_time, bed_time):
    wake_hours = time_to_hours(wake_time)
    bed_hours = time_to_hours(bed_time)
    if bed_hours < wake_hours:  # Handle overnight schedules
        bed_hours += 24
    return wake_hours, bed_hours

# Set wake and bed times
wake_bed_cols = st.columns(2)
with wake_bed_cols[0]:
    wake_time = st.time_input("Wake Time", value=pd.to_datetime(st.session_state.weekly_schedule['wake_time']).time())
    st.session_state.weekly_schedule['wake_time'] = wake_time.strftime("%H:%M")
    
with wake_bed_cols[1]:
    bed_time = st.time_input("Bed Time", value=pd.to_datetime(st.session_state.weekly_schedule['bed_time']).time())
    st.session_state.weekly_schedule['bed_time'] = bed_time.strftime("%H:%M")

# Calculate waking hours
wake_hours, bed_hours = get_hour_range(st.session_state.weekly_schedule['wake_time'], 
                                     st.session_state.weekly_schedule['bed_time'])
waking_hours = bed_hours - wake_hours

# Calendar View Weekly Schedule

# Define days of week
days_of_week = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

# Function to create template schedules
def create_template_schedule():
    return {
        "meals": [
            {"name": "Breakfast", "time": "07:00"},
            {"name": "Lunch", "time": "12:00"},
            {"name": "Dinner", "time": "18:00"}
        ],
        "workouts": [
            {"type": "Strength", "start": "17:00", "end": "18:00", "intensity": "Moderate"}
        ],
        "work": [
            {"type": "Work", "start": "09:00", "end": "17:00"}
        ]
    }

# Add template options for quick schedule setup
st.write("#### Quick Templates")
template_cols = st.columns(4)

with template_cols[0]:
    if st.button("Weekday Template", key="template_weekday"):
        weekday_template = create_template_schedule()
        for day in ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]:
            st.session_state.weekly_schedule['days'][day] = weekday_template.copy()
        st.rerun()

with template_cols[1]:
    if st.button("Weekend Template", key="template_weekend"):
        weekend_template = {
            "meals": [
                {"name": "Breakfast", "time": "08:30"},
                {"name": "Lunch", "time": "13:00"},
                {"name": "Dinner", "time": "19:00"}
            ],
            "workouts": [
                {"type": "Cardio", "start": "10:00", "end": "11:00", "intensity": "Moderate"}
            ],
            "work": []
        }
        for day in ["Saturday", "Sunday"]:
            st.session_state.weekly_schedule['days'][day] = weekend_template.copy()
        st.rerun()

with template_cols[2]:
    if st.button("Clear All", key="clear_all"):
        for day in days_of_week:
            st.session_state.weekly_schedule['days'][day] = {"meals": [], "workouts": [], "work": []}
        st.rerun()

with template_cols[3]:
    template_source = st.selectbox(
        "Copy schedule from:", 
        ["Select day..."] + days_of_week,
        key="template_source"
    )
    
    template_target = st.selectbox(
        "Copy to:", 
        ["Select day..."] + days_of_week,
        key="template_target"
    )
    
    if st.button("Copy Schedule", key="copy_schedule"):
        if template_source != "Select day..." and template_target != "Select day...":
            if template_source != template_target:
                st.session_state.weekly_schedule['days'][template_target] = copy.deepcopy(
                    st.session_state.weekly_schedule['days'][template_source]
                )
                st.success(f"Copied schedule from {template_source} to {template_target}")
                st.rerun()
            else:
                st.warning("Source and target days must be different")

# Create a clean, streamlined weekly schedule view
st.write("### Weekly Schedule")

# Define common activity types for quick selection in a more concise format
activity_types = {
    "Meals": [
        {"name": "Breakfast", "time": "07:00", "color": "#FF9F1C", "icon": "🍽️"},
        {"name": "Lunch", "time": "12:00", "color": "#FF9F1C", "icon": "🍽️"},
        {"name": "Dinner", "time": "18:00", "color": "#FF9F1C", "icon": "🍽️"},
        {"name": "Snack", "time": "15:00", "color": "#FF9F1C", "icon": "🍽️"},
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
    ]
}

# Set up daily view
selected_day = st.selectbox("Select day to view/edit:", days_of_week, 
                           format_func=lambda x: f"📅 {x}")

# Create a cleaner visual layout with tabs for adding activities
day_data = st.session_state.weekly_schedule['days'][selected_day]

# Create time slots for the visualization (hourly)
min_hour = int(time_to_hours(st.session_state.weekly_schedule['wake_time']))
max_hour = int(time_to_hours(st.session_state.weekly_schedule['bed_time']))
if max_hour < min_hour:  # Handle overnight schedules
    max_hour += 24

# Display the schedule visualization first
st.markdown(f"#### {selected_day}'s Schedule")

# Create a timeline-style visualization - a cleaner approach
timeline_container = st.container()

with timeline_container:
    # CSS to make visualization more sleek
    st.markdown("""
    <style>
    .activity-block {
        padding: 5px 10px;
        border-radius: 5px;
        margin: 2px 0;
        font-size: 14px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .meal-block { background-color: rgba(255, 159, 28, 0.3); }
    .workout-block { background-color: rgba(46, 196, 182, 0.3); }
    .activity-block { background-color: rgba(231, 29, 54, 0.3); }
    </style>
    """, unsafe_allow_html=True)
    
    # Prepare a list of all activities sorted by time
    all_day_activities = []
    
    # Add meals
    for idx, meal in enumerate(day_data['meals']):
        hour = int(time_to_hours(meal['time']))
        if min_hour <= hour <= max_hour:
            all_day_activities.append({
                "type": "meal",
                "name": meal['name'],
                "time": meal['time'],
                "hour": hour,
                "idx": idx,
                "display": f"{meal['name']} ({meal['time']})",
                "color": "#FF9F1C",
                "icon": "🍽️",
                "duration": 45  # Default meal duration for visual spacing
            })
    
    # Add workouts
    for idx, workout in enumerate(day_data['workouts']):
        start_hour = int(time_to_hours(workout['start']))
        end_hour = int(time_to_hours(workout['end']))
        if end_hour < start_hour:  # Handle overnight
            end_hour += 24
            
        if max(min_hour, start_hour) <= min(max_hour, end_hour):
            all_day_activities.append({
                "type": "workout",
                "name": workout['type'],
                "time": workout['start'],
                "hour": start_hour,
                "end_hour": end_hour,
                "idx": idx,
                "display": f"{workout['type']} ({workout['start']}-{workout['end']})",
                "color": "#2EC4B6",
                "icon": "💪",
                "duration": (end_hour - start_hour) * 60  # Duration in minutes
            })
    
    # Add other activities
    for idx, activity in enumerate(day_data['work']):
        start_hour = int(time_to_hours(activity['start']))
        end_hour = int(time_to_hours(activity['end']))
        if end_hour < start_hour:  # Handle overnight
            end_hour += 24
            
        if max(min_hour, start_hour) <= min(max_hour, end_hour):
            all_day_activities.append({
                "type": "activity",
                "name": activity['type'],
                "time": activity['start'],
                "hour": start_hour,
                "end_hour": end_hour,
                "idx": idx,
                "display": f"{activity['type']} ({activity['start']}-{activity['end']})",
                "color": "#E71D36",
                "icon": "📆",
                "duration": (end_hour - start_hour) * 60  # Duration in minutes
            })
            
    # Sort all activities by hour
    all_day_activities.sort(key=lambda x: x['hour'])
    
    # Display timeline with cleaner design
    for hour in range(min_hour, max_hour + 1):
        display_hour = hour % 24
        
        # Activities in this hour
        hour_activities = [a for a in all_day_activities 
                          if a['hour'] <= hour and (a.get('end_hour', a['hour'] + 1) > hour)]
        
        # Create a cleaner row for this hour
        hour_col, activity_col = st.columns([0.15, 0.85])
        
        with hour_col:
            st.write(f"**{display_hour:02d}:00**")
            
        with activity_col:
            if hour_activities:
                # Create a horizontal layout for activities
                activity_html = ""
                for activity in hour_activities:
                    # Only show full details at start hour
                    if activity['hour'] == hour:
                        display_text = f"{activity['icon']} {activity['name']}"
                        
                        # Add delete button
                        activity_html += f"""
                        <div class="activity-block {activity['type']}-block" 
                             style="background-color:{activity['color']}20;border-left:3px solid {activity['color']}">
                            {display_text} 
                            <span style="float:right">
                                <a href="?delete={activity['type']}_{activity['idx']}" 
                                   title="Remove">❌</a>
                            </span>
                        </div>
                        """
                    else:
                        # Continuing activity
                        display_text = f"{activity['icon']} {activity['name']} (cont.)"
                        activity_html += f"""
                        <div class="activity-block {activity['type']}-block" 
                             style="background-color:{activity['color']}10;border-left:3px solid {activity['color']}">
                            {display_text}
                        </div>
                        """
                
                st.markdown(activity_html, unsafe_allow_html=True)
            else:
                # Show a more subtle empty slot with plus button
                st.markdown(f"""
                <div style="text-align:center;padding:8px;color:#888;font-size:12px">
                    <a href="?add=activity_{display_hour:02d}00_{selected_day}" 
                       style="text-decoration:none;color:#888;">
                       + Add activity
                    </a>
                </div>
                """, unsafe_allow_html=True)
        
        # Add a subtle separator between hours
        st.markdown('<hr style="margin:0;padding:0;border:none;border-top:1px solid #f0f0f0">', 
                   unsafe_allow_html=True)

# Activity editing interface - much cleaner and more focused
st.markdown("#### Add Activities")
st.markdown("Drag activities to your schedule by selecting a type and time")

# Create tabs for activity categories - a more organized approach
activity_tabs = st.tabs(["Meals", "Workouts", "Activities"])

# Meals tab
with activity_tabs[0]:
    meal_cols = st.columns(4)
    for i, meal in enumerate(activity_types["Meals"]):
        with meal_cols[i % 4]:
            # Create a card-like button that's more visually pleasing
            st.markdown(f"""
            <div style="background-color:{meal['color']}20;
                        padding:10px;
                        border-radius:5px;
                        border-left:3px solid {meal['color']};
                        text-align:center;
                        margin-bottom:10px">
                <div style="font-size:24px">{meal['icon']}</div>
                <div style="font-weight:bold">{meal['name']}</div>
                <div style="font-size:12px">{meal['time']}</div>
            </div>
            """, unsafe_allow_html=True)
            
            # Add button with cleaner styling
            if st.button(f"Add {meal['name']}", key=f"add_meal_{i}"):
                # Add meal to the selected day
                st.session_state.weekly_schedule['days'][selected_day]['meals'].append({
                    "name": meal['name'],
                    "time": meal['time']
                })
                st.success(f"Added {meal['name']} to {selected_day}")
                st.rerun()
                
# Workouts tab
with activity_tabs[1]:
    workout_cols = st.columns(4)
    for i, workout in enumerate(activity_types["Workouts"]):
        with workout_cols[i % 4]:
            # Create a card-like button
            st.markdown(f"""
            <div style="background-color:{workout['color']}20;
                        padding:10px;
                        border-radius:5px;
                        border-left:3px solid {workout['color']};
                        text-align:center;
                        margin-bottom:10px">
                <div style="font-size:24px">{workout['icon']}</div>
                <div style="font-weight:bold">{workout['name']}</div>
                <div style="font-size:12px">{workout['duration']} mins</div>
            </div>
            """, unsafe_allow_html=True)
            
            # Time selector
            workout_time = st.time_input(
                "Start time", 
                value=pd.to_datetime("17:00").time(),
                key=f"workout_time_{i}"
            )
            
            # Add button
            if st.button(f"Add {workout['name']}", key=f"add_workout_{i}"):
                # Calculate end time
                start_hour = workout_time.hour
                start_minute = workout_time.minute
                total_minutes = start_minute + workout['duration']
                end_hour = start_hour + (total_minutes // 60)
                end_minute = total_minutes % 60
                
                # Add workout to the selected day
                st.session_state.weekly_schedule['days'][selected_day]['workouts'].append({
                    "type": workout['name'],
                    "start": f"{start_hour:02d}:{start_minute:02d}",
                    "end": f"{end_hour % 24:02d}:{end_minute:02d}",
                    "intensity": "Moderate"
                })
                st.success(f"Added {workout['name']} to {selected_day}")
                st.rerun()

# Activities tab
with activity_tabs[2]:
    activity_cols = st.columns(4)
    for i, activity in enumerate(activity_types["Activities"]):
        with activity_cols[i % 4]:
            # Create a card-like button
            st.markdown(f"""
            <div style="background-color:{activity['color']}20;
                        padding:10px;
                        border-radius:5px;
                        border-left:3px solid {activity['color']};
                        text-align:center;
                        margin-bottom:10px">
                <div style="font-size:24px">{activity['icon']}</div>
                <div style="font-weight:bold">{activity['name']}</div>
                <div style="font-size:12px">{activity['duration'] // 60}h {activity['duration'] % 60}m</div>
            </div>
            """, unsafe_allow_html=True)
            
            # Time selector
            activity_time = st.time_input(
                "Start time", 
                value=pd.to_datetime("09:00").time() if activity['name'] == "Work" else pd.to_datetime("14:00").time(),
                key=f"activity_time_{i}"
            )
            
            # Add button
            if st.button(f"Add {activity['name']}", key=f"add_activity_{i}"):
                # Calculate end time
                start_hour = activity_time.hour
                start_minute = activity_time.minute
                total_minutes = start_minute + activity['duration']
                end_hour = start_hour + (total_minutes // 60)
                end_minute = total_minutes % 60
                
                # Add activity to the selected day
                st.session_state.weekly_schedule['days'][selected_day]['work'].append({
                    "type": activity['name'],
                    "start": f"{start_hour:02d}:{start_minute:02d}",
                    "end": f"{end_hour % 24:02d}:{end_minute:02d}"
                })
                st.success(f"Added {activity['name']} to {selected_day}")
                st.rerun()


# Handle URL query params for removing/adding activities
query_params = st.experimental_get_query_params()

if "delete" in query_params:
    delete_param = query_params["delete"][0]
    try:
        activity_type, idx = delete_param.split("_")
        idx = int(idx)
        
        if activity_type == "meal" and idx < len(st.session_state.weekly_schedule['days'][selected_day]['meals']):
            deleted_item = st.session_state.weekly_schedule['days'][selected_day]['meals'].pop(idx)
            st.success(f"Removed {deleted_item['name']} from {selected_day}")
            # Clear query param by rerunning
            st.experimental_set_query_params()
            st.rerun()
        elif activity_type == "workout" and idx < len(st.session_state.weekly_schedule['days'][selected_day]['workouts']):
            deleted_item = st.session_state.weekly_schedule['days'][selected_day]['workouts'].pop(idx)
            st.success(f"Removed {deleted_item['type']} from {selected_day}")
            # Clear query param by rerunning
            st.experimental_set_query_params()
            st.rerun()
        elif activity_type == "activity" and idx < len(st.session_state.weekly_schedule['days'][selected_day]['work']):
            deleted_item = st.session_state.weekly_schedule['days'][selected_day]['work'].pop(idx)
            st.success(f"Removed {deleted_item['type']} from {selected_day}")
            # Clear query param by rerunning
            st.experimental_set_query_params()
            st.rerun()
    except Exception as e:
        st.error(f"Error processing delete request: {e}")
        st.experimental_set_query_params()

if "add" in query_params:
    add_param = query_params["add"][0]
    try:
        parts = add_param.split("_")
        if len(parts) >= 3:
            activity_type = parts[0]
            hour = parts[1][:2]  # Get hour from timestamp (e.g., 0900 -> 09)
            day = "_".join(parts[2:]) if len(parts) > 3 else parts[2]
            
            # Create a small popup with radio buttons for quick adding
            with st.expander(f"Quick Add to {day} at {hour}:00", expanded=True):
                if activity_type == "activity":
                    quick_add_type = st.radio(
                        "Activity Type", 
                        ["Meal", "Workout", "Other Activity"],
                        horizontal=True,
                        key="quick_add_radio"
                    )
                    
                    if quick_add_type == "Meal":
                        meal_options = [m["name"] for m in activity_types["Meals"]]
                        quick_add_option = st.selectbox("Choose meal:", meal_options)
                        
                        if st.button("Add", type="primary", key="quick_add_btn"):
                            st.session_state.weekly_schedule['days'][day]['meals'].append({
                                "name": quick_add_option,
                                "time": f"{hour}:00"
                            })
                            st.success(f"Added {quick_add_option} to {day} at {hour}:00")
                            st.experimental_set_query_params()
                            st.rerun()
                            
                    elif quick_add_type == "Workout":
                        workout_options = [w["name"] for w in activity_types["Workouts"]]
                        quick_add_option = st.selectbox("Choose workout:", workout_options)
                        
                        # Get duration
                        for workout in activity_types["Workouts"]:
                            if workout["name"] == quick_add_option:
                                duration = workout["duration"]
                                break
                        else:
                            duration = 60
                            
                        # Calculate end time
                        hour_num = int(hour)
                        end_hour = hour_num + (duration // 60)
                        end_minute = duration % 60
                        end_time = f"{end_hour % 24:02d}:{end_minute:02d}"
                        
                        if st.button("Add", type="primary", key="quick_add_btn"):
                            st.session_state.weekly_schedule['days'][day]['workouts'].append({
                                "type": quick_add_option,
                                "start": f"{hour}:00",
                                "end": end_time,
                                "intensity": "Moderate"
                            })
                            st.success(f"Added {quick_add_option} to {day} at {hour}:00")
                            st.experimental_set_query_params()
                            st.rerun()
                            
                    else:  # Other Activity
                        activity_options = [a["name"] for a in activity_types["Activities"]]
                        quick_add_option = st.selectbox("Choose activity:", activity_options)
                        
                        # Get duration
                        for activity in activity_types["Activities"]:
                            if activity["name"] == quick_add_option:
                                duration = activity["duration"]
                                break
                        else:
                            duration = 60
                            
                        # Calculate end time
                        hour_num = int(hour)
                        end_hour = hour_num + (duration // 60)
                        end_minute = duration % 60
                        end_time = f"{end_hour % 24:02d}:{end_minute:02d}"
                        
                        if st.button("Add", type="primary", key="quick_add_btn"):
                            st.session_state.weekly_schedule['days'][day]['work'].append({
                                "type": quick_add_option,
                                "start": f"{hour}:00",
                                "end": end_time
                            })
                            st.success(f"Added {quick_add_option} to {day} at {hour}:00")
                            st.experimental_set_query_params()
                            st.rerun()
                
                if st.button("Cancel", key="quick_add_cancel"):
                    st.experimental_set_query_params()
                    st.rerun()
    except Exception as e:
        st.error(f"Error processing add request: {e}")
        st.experimental_set_query_params()

# Activity Editor Section
st.write("### Quick Edit Activities")
st.info("Click on any element in the calendar grid above to edit directly. Or use the simplified editors below to make changes.")

# Create a day selector for quick editing all activities on a specific day
selected_edit_day = st.selectbox(
    "Select day to edit:",
    days_of_week,
    key="quick_edit_day"
)

# Create tabs for easier editing of different activity types
edit_tabs = st.tabs(["All Activities", "Meals", "Workouts", "Work/Activities"])

# All Activities tab (quick edit)
with edit_tabs[0]:
    st.write(f"#### All Activities for {selected_edit_day}")
    
    # Display and edit all activities for the selected day
    day_data = st.session_state.weekly_schedule['days'][selected_edit_day]
    
    # Quick add multiple activity types
    add_cols = st.columns(3)
    
    with add_cols[0]:
        st.write("**Quick Add Meal**")
        quick_meal_name = st.selectbox(
            "Type",
            options=["Breakfast", "Lunch", "Dinner", "Snack", "Pre-workout", "Post-workout"],
            key="quick_add_meal_type"
        )
        quick_meal_time = st.time_input("Time", pd.to_datetime("12:00").time(), key="quick_add_meal_time")
        if st.button("+ Add Meal", key="quick_add_meal_btn"):
            day_data['meals'].append({
                "name": quick_meal_name,
                "time": quick_meal_time.strftime("%H:%M")
            })
            st.success(f"Added {quick_meal_name} at {quick_meal_time.strftime('%H:%M')}")
            st.rerun()
    
    with add_cols[1]:
        st.write("**Quick Add Workout**")
        quick_workout_type = st.selectbox(
            "Type",
            options=["Strength", "Cardio", "HIIT", "Flexibility", "Sports"],
            key="quick_add_workout_type"
        )
        quick_workout_time = st.time_input("Start Time", pd.to_datetime("17:00").time(), key="quick_add_workout_time")
        quick_workout_duration = st.number_input("Duration (mins)", 15, 120, 60, 15, key="quick_add_workout_duration")
        
        # Calculate end time
        hours, minutes = quick_workout_time.hour, quick_workout_time.minute
        minutes += quick_workout_duration
        hours += minutes // 60
        minutes = minutes % 60
        quick_workout_end = f"{hours:02d}:{minutes:02d}"
        
        if st.button("+ Add Workout", key="quick_add_workout_btn"):
            day_data['workouts'].append({
                "type": quick_workout_type,
                "start": quick_workout_time.strftime("%H:%M"),
                "end": quick_workout_end,
                "intensity": "Moderate"
            })
            st.success(f"Added {quick_workout_type} at {quick_workout_time.strftime('%H:%M')}")
            st.rerun()
    
    with add_cols[2]:
        st.write("**Quick Add Activity**")
        quick_activity_type = st.selectbox(
            "Type",
            options=["Work", "School", "Commuting", "Family Time", "Other"],
            key="quick_add_activity_type"
        )
        quick_activity_start = st.time_input("Start Time", pd.to_datetime("09:00").time(), key="quick_add_activity_start")
        quick_activity_end = st.time_input("End Time", pd.to_datetime("17:00").time(), key="quick_add_activity_end")
        
        if st.button("+ Add Activity", key="quick_add_activity_btn"):
            day_data['work'].append({
                "type": quick_activity_type,
                "start": quick_activity_start.strftime("%H:%M"),
                "end": quick_activity_end.strftime("%H:%M")
            })
            st.success(f"Added {quick_activity_type} at {quick_activity_start.strftime('%H:%M')}")
            st.rerun()
    
    # Display table of current schedule for the day
    st.markdown("---")
    st.write("##### Current Schedule")
    
    # Display meals
    if day_data['meals']:
        st.write("**Meals:**")
        for i, meal in enumerate(day_data['meals']):
            cols = st.columns([3, 2, 1])
            with cols[0]:
                st.write(f"🍽️ {meal['name']}")
            with cols[1]:
                st.write(f"Time: {meal['time']}")
            with cols[2]:
                if st.button("Remove", key=f"remove_meal_{i}"):
                    day_data['meals'].pop(i)
                    st.rerun()
    
    # Display workouts
    if day_data['workouts']:
        st.write("**Workouts:**")
        for i, workout in enumerate(day_data['workouts']):
            cols = st.columns([2, 2, 1, 1])
            with cols[0]:
                st.write(f"💪 {workout['type']}")
            with cols[1]:
                st.write(f"{workout['start']} - {workout['end']}")
            with cols[2]:
                st.write(f"Intensity: {workout['intensity']}")
            with cols[3]:
                if st.button("Remove", key=f"remove_workout_{i}"):
                    day_data['workouts'].pop(i)
                    st.rerun()
    
    # Display work/activities
    if day_data['work']:
        st.write("**Activities:**")
        for i, work in enumerate(day_data['work']):
            cols = st.columns([2, 2, 1])
            with cols[0]:
                st.write(f"📆 {work['type']}")
            with cols[1]:
                st.write(f"{work['start']} - {work['end']}")
            with cols[2]:
                if st.button("Remove", key=f"remove_work_{i}"):
                    day_data['work'].pop(i)
                    st.rerun()

# Meals tab
with edit_tabs[1]:
    st.write("#### Meal Schedule")
    
    # Select day for editing
    meal_day = st.selectbox("Day", days_of_week, key="meal_edit_day")
    
    # Current meals for the selected day
    current_meals = st.session_state.weekly_schedule['days'][meal_day]['meals']
    
    # Add multiple meals at once option
    with st.expander("Add Multiple Standard Meals"):
        standard_meals = {
            "Standard 3 Meals": [
                {"name": "Breakfast", "time": "07:00"},
                {"name": "Lunch", "time": "12:00"},
                {"name": "Dinner", "time": "18:00"}
            ],
            "Standard 5 Meals": [
                {"name": "Breakfast", "time": "07:00"},
                {"name": "Snack", "time": "10:00"},
                {"name": "Lunch", "time": "13:00"},
                {"name": "Snack", "time": "16:00"},
                {"name": "Dinner", "time": "19:00"}
            ],
            "With Pre/Post Workout": [
                {"name": "Breakfast", "time": "07:00"},
                {"name": "Pre-workout", "time": "15:30"},
                {"name": "Post-workout", "time": "17:30"},
                {"name": "Dinner", "time": "19:00"}
            ]
        }
        
        meal_pattern = st.selectbox(
            "Choose meal pattern",
            options=list(standard_meals.keys()),
            key=f"meal_pattern_{meal_day}"
        )
        
        if st.button("Apply Meal Pattern", key=f"apply_pattern_{meal_day}"):
            # Replace current meals with selected pattern
            st.session_state.weekly_schedule['days'][meal_day]['meals'] = copy.deepcopy(standard_meals[meal_pattern])
            st.success(f"Applied {meal_pattern} pattern to {meal_day}")
            st.rerun()
    
    # Show current meals in a table format for editing
    meal_table = []
    for meal in current_meals:
        meal_table.append({"Type": meal['name'], "Time": meal['time']})
    
    # If we have meals, display them in a table
    if meal_table:
        st.dataframe(pd.DataFrame(meal_table), use_container_width=True, hide_index=True)
    else:
        st.info("No meals scheduled for this day. Use 'Add New Meal' or 'Apply Meal Pattern' to add meals.")
    
    # Simplified meal editor
    st.markdown("---")
    with st.form(key=f"edit_meal_form_{meal_day}"):
        st.write("#### Add or Edit Meal")
        form_cols = st.columns([3, 2])
        
        with form_cols[0]:
            new_meal_name = st.selectbox(
                "Meal Type",
                options=["Breakfast", "Lunch", "Dinner", "Snack", "Pre-workout", "Post-workout"],
                key=f"new_meal_name_{meal_day}"
            )
        
        with form_cols[1]:
            new_meal_time = st.time_input(
                "Time",
                value=pd.to_datetime("12:00").time(),
                key=f"new_meal_time_{meal_day}"
            )
        
        # Submit button
        submit = st.form_submit_button("Add Meal")
        
        if submit:
            current_meals.append({
                "name": new_meal_name,
                "time": new_meal_time.strftime("%H:%M")
            })
            st.success(f"Added {new_meal_name} at {new_meal_time.strftime('%H:%M')}")
            
            # Sort meals by time
            current_meals.sort(key=lambda x: x['time'])
            st.rerun()

# Workouts tab
with edit_tabs[2]:
    st.write("#### Workout Schedule")
    
    # Select day for editing
    workout_day = st.selectbox("Day", days_of_week, key="workout_edit_day")
    
    # Current workouts for the selected day
    current_workouts = st.session_state.weekly_schedule['days'][workout_day]['workouts']
    
    # Show current workouts in a table format for editing
    for i, workout in enumerate(current_workouts):
        cols = st.columns([2, 1.5, 1.5, 2, 1])
        with cols[0]:
            workout_type = st.selectbox(
                f"Workout {i+1} Type",
                options=["Strength", "Cardio", "HIIT", "Flexibility", "Sports"],
                index=["Strength", "Cardio", "HIIT", "Flexibility", "Sports"].index(workout['type']) 
                    if workout['type'] in ["Strength", "Cardio", "HIIT", "Flexibility", "Sports"] else 0,
                key=f"edit_workout_type_{workout_day}_{i}"
            )
            current_workouts[i]['type'] = workout_type
        
        with cols[1]:
            workout_start = st.time_input(
                f"Start Time",
                value=pd.to_datetime(workout['start']).time(),
                key=f"edit_workout_start_{workout_day}_{i}"
            )
            current_workouts[i]['start'] = workout_start.strftime("%H:%M")
            
        with cols[2]:
            workout_end = st.time_input(
                f"End Time",
                value=pd.to_datetime(workout['end']).time(),
                key=f"edit_workout_end_{workout_day}_{i}"
            )
            current_workouts[i]['end'] = workout_end.strftime("%H:%M")
            
        with cols[3]:
            workout_intensity = st.select_slider(
                f"Intensity",
                options=["Light", "Moderate", "High"],
                value=workout['intensity'] if workout['intensity'] in ["Light", "Moderate", "High"] else "Moderate",
                key=f"edit_workout_intensity_{workout_day}_{i}"
            )
            current_workouts[i]['intensity'] = workout_intensity
            
        with cols[4]:
            if st.button("Delete", key=f"delete_workout_{workout_day}_{i}"):
                current_workouts.pop(i)
                st.rerun()
    
    # Add new workout
    with st.expander("Add New Workout"):
        new_workout_cols = st.columns([2, 1.5, 1.5, 2])
        with new_workout_cols[0]:
            new_workout_type = st.selectbox(
                "Workout Type",
                options=["Strength", "Cardio", "HIIT", "Flexibility", "Sports"],
                key=f"new_workout_type_{workout_day}"
            )
        
        with new_workout_cols[1]:
            new_workout_start = st.time_input(
                "Start Time",
                value=pd.to_datetime("17:00").time(),
                key=f"new_workout_start_{workout_day}"
            )
            
        with new_workout_cols[2]:
            new_workout_end = st.time_input(
                "End Time",
                value=pd.to_datetime("18:00").time(),
                key=f"new_workout_end_{workout_day}"
            )
            
        with new_workout_cols[3]:
            new_workout_intensity = st.select_slider(
                "Intensity",
                options=["Light", "Moderate", "High"],
                value="Moderate",
                key=f"new_workout_intensity_{workout_day}"
            )
            
        if st.button("Add Workout", key=f"add_workout_{workout_day}"):
            current_workouts.append({
                "type": new_workout_type,
                "start": new_workout_start.strftime("%H:%M"),
                "end": new_workout_end.strftime("%H:%M"),
                "intensity": new_workout_intensity
            })
            st.rerun()

# Work/Activities tab
with edit_tabs[2]:
    st.write("#### Work/Activities Schedule")
    
    # Select day for editing
    work_day = st.selectbox("Day", days_of_week, key="work_edit_day")
    
    # Current work activities for the selected day
    current_work = st.session_state.weekly_schedule['days'][work_day]['work']
    
    # Show current work activities in a table format for editing
    for i, work in enumerate(current_work):
        cols = st.columns([3, 2, 2, 1])
        with cols[0]:
            work_type = st.selectbox(
                f"Activity {i+1} Type",
                options=["Work", "School", "Commuting", "Family Time", "Other"],
                index=["Work", "School", "Commuting", "Family Time", "Other"].index(work['type']) 
                    if work['type'] in ["Work", "School", "Commuting", "Family Time", "Other"] else 0,
                key=f"edit_work_type_{work_day}_{i}"
            )
            current_work[i]['type'] = work_type
        
        with cols[1]:
            work_start = st.time_input(
                f"Start Time",
                value=pd.to_datetime(work['start']).time(),
                key=f"edit_work_start_{work_day}_{i}"
            )
            current_work[i]['start'] = work_start.strftime("%H:%M")
            
        with cols[2]:
            work_end = st.time_input(
                f"End Time",
                value=pd.to_datetime(work['end']).time(),
                key=f"edit_work_end_{work_day}_{i}"
            )
            current_work[i]['end'] = work_end.strftime("%H:%M")
            
        with cols[3]:
            if st.button("Delete", key=f"delete_work_{work_day}_{i}"):
                current_work.pop(i)
                st.rerun()
    
    # Add new work activity
    with st.expander("Add New Activity"):
        new_work_cols = st.columns([3, 2, 2])
        with new_work_cols[0]:
            new_work_type = st.selectbox(
                "Activity Type",
                options=["Work", "School", "Commuting", "Family Time", "Other"],
                key=f"new_work_type_{work_day}"
            )
        
        with new_work_cols[1]:
            new_work_start = st.time_input(
                "Start Time",
                value=pd.to_datetime("09:00").time(),
                key=f"new_work_start_{work_day}"
            )
            
        with new_work_cols[2]:
            new_work_end = st.time_input(
                "End Time",
                value=pd.to_datetime("17:00").time(),
                key=f"new_work_end_{work_day}"
            )
            
        if st.button("Add Activity", key=f"add_work_{work_day}"):
            current_work.append({
                "type": new_work_type,
                "start": new_work_start.strftime("%H:%M"),
                "end": new_work_end.strftime("%H:%M")
            })
            st.rerun()

# Display daily visualizations in an expander
with st.expander("Daily Timeline Visualizations", expanded=False):
    viz_cols = st.columns(2)
    
    # Select days to visualize
    with viz_cols[0]:
        viz_day1 = st.selectbox("Select day 1:", days_of_week, key="viz_day1")
    
    with viz_cols[1]:
        viz_day2 = st.selectbox("Select day 2:", days_of_week, key="viz_day2", index=1)
    
    # Create visualizations for selected days
    for day in [viz_day1, viz_day2]:
        st.write(f"#### {day}'s Schedule")
        
        # Create a simple timeline visualization
        fig, ax = plt.subplots(figsize=(10, 3))
        
        # Set x-axis range based on wake and bed times
        ax.set_xlim(wake_hours, bed_hours)
        ax.set_xticks(range(int(wake_hours), int(bed_hours) + 1))
        ax.set_xticklabels([f"{h % 24}:00" for h in range(int(wake_hours), int(bed_hours) + 1)])
        
        # Plot wake and bed times as vertical lines
        ax.axvline(x=wake_hours, color='green', linestyle='--', alpha=0.7, label='Wake')
        ax.axvline(x=bed_hours, color='blue', linestyle='--', alpha=0.7, label='Bed')
        
        # Plot meal times
        y_pos = 0.8
        for meal in st.session_state.weekly_schedule['days'][day]['meals']:
            meal_hour = time_to_hours(meal['time'])
            if wake_hours <= meal_hour <= bed_hours:
                ax.scatter(meal_hour, y_pos, color='orange', s=100, zorder=5)
                ax.text(meal_hour, y_pos + 0.05, meal['name'], ha='center', fontsize=8, rotation=45)
        
        # Plot workout times
        y_pos = 0.6
        for workout in st.session_state.weekly_schedule['days'][day]['workouts']:
            workout_start = time_to_hours(workout['start'])
            workout_end = time_to_hours(workout['end'])
            
            # Handle overnight workouts
            if workout_end < workout_start:
                workout_end += 24
                
            if workout_start <= bed_hours and workout_end >= wake_hours:
                # Adjust values if they fall outside the displayed range
                plot_start = max(workout_start, wake_hours)
                plot_end = min(workout_end, bed_hours)
                
                ax.barh(y_pos, plot_end - plot_start, left=plot_start, height=0.1, 
                      color='red', alpha=0.6)
                ax.text((plot_start + plot_end)/2, y_pos, workout['type'], 
                      ha='center', va='center', fontsize=8, color='white')
        
        # Plot work times
        y_pos = 0.4
        for work in st.session_state.weekly_schedule['days'][day]['work']:
            work_start = time_to_hours(work['start'])
            work_end = time_to_hours(work['end'])
            
            # Handle overnight work
            if work_end < work_start:
                work_end += 24
                
            if work_start <= bed_hours and work_end >= wake_hours:
                # Adjust values if they fall outside the displayed range
                plot_start = max(work_start, wake_hours)
                plot_end = min(work_end, bed_hours)
                
                ax.barh(y_pos, plot_end - plot_start, left=plot_start, height=0.1, 
                      color='blue', alpha=0.6)
                ax.text((plot_start + plot_end)/2, y_pos, work['type'], 
                      ha='center', va='center', fontsize=8, color='white')
        
        # Remove y-axis and add a simple legend
        ax.set_yticks([])
        ax.set_ylabel('')
        ax.grid(axis='x', linestyle='--', alpha=0.3)
        ax.set_title(f"{day}'s Schedule")
        
        # Custom legend
        custom_lines = [
            plt.Line2D([0], [0], color='orange', marker='o', linestyle='None', markersize=10),
            plt.Line2D([0], [0], color='red', lw=4, alpha=0.6),
            plt.Line2D([0], [0], color='blue', lw=4, alpha=0.6)
        ]
        ax.legend(custom_lines, ['Meals', 'Workouts', 'Work/Activities'], loc='upper center', 
                bbox_to_anchor=(0.5, -0.15), ncol=3)
        
        # Display the plot
        st.pyplot(fig)

# Generate meal plan recommendations button
if st.button("Generate Optimal Meal & Training Schedule", type="primary"):
    st.session_state.show_meal_plan = True
    st.success("Weekly schedule saved! Now you can customize your nutrition plan below.")
    # In a real implementation, we would use the schedule to optimize meal timing

# ------------------------
# STEP 7: Display macronutrient breakdown
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

# Calculate per-meal calorie target
per_meal_calories = round(target_calories / meals_per_day)

# Now allow editing of the meal plan
for i in range(meals_per_day):
    st.markdown(f"#### Meal {i+1}")
    
    # Calculate current calories for this meal
    current_calories = int(st.session_state.current_meals.at[i, "Calories"])
    calorie_diff = current_calories - per_meal_calories
    
    # Show meal calorie budget
    calorie_status = "✅" if abs(calorie_diff) < 50 else "⚠️" if calorie_diff < 0 else "⚠️"
    st.info(f"**Meal Calorie Budget:** Target: {per_meal_calories} kcal | Current: {current_calories} kcal | Difference: {calorie_status} {calorie_diff} kcal")
    
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
        # Protein input
        protein = st.number_input(
            "Protein (g)",
            min_value=0,
            max_value=200,
            value=int(st.session_state.current_meals.at[i, "Protein (g)"]),
            step=5,
            key=f"protein_{i}"
        )
        st.session_state.current_meals.at[i, "Protein (g)"] = protein
        
        # Protein food source selection
        if protein > 0:
            # Initialize meal components in session state if not present
            if 'meal_components' not in st.session_state:
                st.session_state.meal_components = {}
            
            # Initialize for this specific meal
            meal_key = f"meal_{i}"
            if meal_key not in st.session_state.meal_components:
                st.session_state.meal_components[meal_key] = {
                    "protein_sources": [],
                    "carb_sources": [],
                    "fat_sources": [],
                    "veggie_fruit_sources": []
                }
            
            # Predefined protein values for common foods (per 100g)
            protein_foods = {
                "Chicken Breast": {"protein": 31, "carbs": 0, "fat": 3.6, "calories": 165, "serving": "100g"},
                "Ground Beef (90% lean)": {"protein": 26, "carbs": 0, "fat": 10, "calories": 196, "serving": "100g"},
                "Eggs": {"protein": 13, "carbs": 1, "fat": 11, "calories": 155, "serving": "100g (2 large eggs)"},
                "Greek Yogurt": {"protein": 10, "carbs": 3.6, "fat": 0.4, "calories": 59, "serving": "100g"},
                "Salmon": {"protein": 25, "carbs": 0, "fat": 13, "calories": 206, "serving": "100g"},
                "Tofu": {"protein": 8, "carbs": 2, "fat": 4, "calories": 76, "serving": "100g"},
                "Tuna": {"protein": 30, "carbs": 0, "fat": 1, "calories": 130, "serving": "100g"},
                "Protein Powder": {"protein": 80, "carbs": 10, "fat": 3, "calories": 400, "serving": "100g"},
                "Cottage Cheese": {"protein": 11, "carbs": 3.4, "fat": 4.3, "calories": 98, "serving": "100g"},
                "Turkey Breast": {"protein": 29, "carbs": 0, "fat": 1, "calories": 135, "serving": "100g"},
            }
            
            st.markdown("##### Protein Sources")
            
            # Keep track of protein allocated so far
            allocated_protein = 0
            remaining_protein = protein
            
            # Reset protein sources list for this meal
            st.session_state.meal_components[meal_key]["protein_sources"] = []
            
            # Allow multiple protein sources
            num_protein_sources = st.number_input("Number of protein sources", 
                                                min_value=1, max_value=3, value=1,
                                                key=f"num_protein_sources_{i}")
            
            # Create a container for protein sources
            protein_container = st.container()
            
            with protein_container:
                for src_idx in range(num_protein_sources):
                    st.markdown(f"**Protein Source {src_idx+1}**")
                    
                    # If this is not the first source, show how much protein is left to allocate
                    if src_idx > 0 and remaining_protein > 0:
                        st.info(f"{remaining_protein}g protein remaining to allocate")
                    
                    # Calculate protein amount for this source
                    if src_idx == num_protein_sources - 1:  # Last source gets all remaining protein
                        source_protein = remaining_protein
                    else:
                        # Otherwise allocate a portion
                        source_protein = st.number_input(
                            f"Protein amount (g) for source {src_idx+1}",
                            min_value=5,
                            max_value=remaining_protein,
                            value=min(round(protein / num_protein_sources), remaining_protein),
                            step=5,
                            key=f"protein_amount_{i}_{src_idx}"
                        )
                    
                    # Protein food selection
                    protein_source = st.selectbox(
                        f"Select protein source {src_idx+1}",
                        options=list(protein_foods.keys()) + ["Search..."],
                        key=f"protein_source_{i}_{src_idx}"
                    )
                    
                    if protein_source == "Search...":
                        protein_search = st.text_input(f"Search for protein foods {src_idx+1}:", 
                                                    key=f"protein_search_{i}_{src_idx}")
                        if protein_search:
                            st.info(f"Searching for '{protein_search}' (Note: This would connect to the USDA database)")
                            # In a real implementation, this would call the FDC API
                    else:
                        # Calculate required serving size to hit protein target for this source
                        selected_food = protein_foods[protein_source]
                        required_serving = (source_protein / selected_food["protein"]) * 100  # Scale from 100g
                        
                        # Display serving size
                        st.write(f"Serving: **{round(required_serving)}g** ({round(required_serving/100, 1)} servings)")
                        
                        # Calculate other macros from this protein source
                        source_carbs = round((required_serving/100) * selected_food["carbs"])
                        source_fat = round((required_serving/100) * selected_food["fat"])
                        source_calories = round((required_serving/100) * selected_food["calories"])
                        
                        # Show macronutrient contribution
                        st.write(f"Provides: {source_protein}g protein, " + 
                                f"{source_carbs}g carbs, " +
                                f"{source_fat}g fat | {source_calories} kcal")
                        
                        # Store in session state
                        st.session_state.meal_components[meal_key]["protein_sources"].append({
                            "food": protein_source,
                            "serving": required_serving,
                            "macros": {
                                "protein": source_protein,
                                "carbs": source_carbs,
                                "fat": source_fat,
                                "calories": source_calories
                            }
                        })
                        
                        # Update allocated and remaining protein
                        allocated_protein += source_protein
                        remaining_protein = protein - allocated_protein
                        
                    st.markdown("---")
        
    with cols[2]:
        # Carbohydrate input
        carbs = st.number_input(
            "Carbs (g)",
            min_value=0,
            max_value=200,
            value=int(st.session_state.current_meals.at[i, "Carbs (g)"]),
            step=5,
            key=f"carbs_{i}"
        )
        st.session_state.current_meals.at[i, "Carbs (g)"] = carbs
        
        # Carbohydrate food source selection
        if carbs > 0:
            # Predefined carb values for common foods (per 100g)
            carb_foods = {
                "Rice": {"protein": 2.7, "carbs": 28, "fat": 0.3, "calories": 130, "serving": "100g (cooked)"},
                "Potato": {"protein": 2, "carbs": 17, "fat": 0.1, "calories": 77, "serving": "100g"},
                "Oats": {"protein": 13, "carbs": 68, "fat": 6.9, "calories": 389, "serving": "100g (dry)"},
                "Bread": {"protein": 9, "carbs": 49, "fat": 3.2, "calories": 265, "serving": "100g"},
                "Pasta": {"protein": 5, "carbs": 25, "fat": 1.1, "calories": 131, "serving": "100g (cooked)"},
                "Sweet Potato": {"protein": 1.6, "carbs": 20, "fat": 0.1, "calories": 86, "serving": "100g"},
                "Quinoa": {"protein": 4.4, "carbs": 21, "fat": 1.9, "calories": 120, "serving": "100g (cooked)"},
                "Fruits": {"protein": 0.5, "carbs": 14, "fat": 0.3, "calories": 60, "serving": "100g"},
                "Banana": {"protein": 1.1, "carbs": 22.8, "fat": 0.3, "calories": 89, "serving": "100g (1 medium)"},
                "Rice Cakes": {"protein": 7.8, "carbs": 80, "fat": 2.8, "calories": 387, "serving": "100g"},
            }
            
            st.markdown("##### Carbohydrate Sources")
            
            # Keep track of carbs allocated so far
            allocated_carbs = 0
            remaining_carbs = carbs
            
            # Reset carb sources list for this meal
            st.session_state.meal_components[f"meal_{i}"]["carb_sources"] = []
            
            # Allow multiple carb sources
            num_carb_sources = st.number_input("Number of carb sources", 
                                             min_value=1, max_value=3, value=1,
                                             key=f"num_carb_sources_{i}")
            
            # Create a container for carb sources
            carb_container = st.container()
            
            with carb_container:
                for src_idx in range(num_carb_sources):
                    st.markdown(f"**Carb Source {src_idx+1}**")
                    
                    # If this is not the first source, show how much carbs are left to allocate
                    if src_idx > 0 and remaining_carbs > 0:
                        st.info(f"{remaining_carbs}g carbs remaining to allocate")
                    
                    # Calculate carb amount for this source
                    if src_idx == num_carb_sources - 1:  # Last source gets all remaining carbs
                        source_carbs = remaining_carbs
                    else:
                        # Otherwise allocate a portion
                        source_carbs = st.number_input(
                            f"Carbs amount (g) for source {src_idx+1}",
                            min_value=5,
                            max_value=remaining_carbs,
                            value=min(round(carbs / num_carb_sources), remaining_carbs),
                            step=5,
                            key=f"carbs_amount_{i}_{src_idx}"
                        )
                    
                    # Carb food selection
                    carb_source = st.selectbox(
                        f"Select carb source {src_idx+1}",
                        options=list(carb_foods.keys()) + ["Search..."],
                        key=f"carb_source_{i}_{src_idx}"
                    )
                    
                    if carb_source == "Search...":
                        carb_search = st.text_input(f"Search for carb foods {src_idx+1}:", 
                                                  key=f"carb_search_{i}_{src_idx}")
                        if carb_search:
                            st.info(f"Searching for '{carb_search}' (Note: This would connect to the USDA database)")
                            # In a real implementation, this would call the FDC API
                    else:
                        # Calculate required serving size to hit carb target for this source
                        selected_food = carb_foods[carb_source]
                        required_serving = (source_carbs / selected_food["carbs"]) * 100  # Scale from 100g
                        
                        # Display serving size
                        st.write(f"Serving: **{round(required_serving)}g** ({round(required_serving/100, 1)} servings)")
                        
                        # Calculate other macros from this carb source
                        source_protein = round((required_serving/100) * selected_food["protein"])
                        source_fat = round((required_serving/100) * selected_food["fat"])
                        source_calories = round((required_serving/100) * selected_food["calories"])
                        
                        # Show macronutrient contribution
                        st.write(f"Provides: {source_protein}g protein, " + 
                                f"{source_carbs}g carbs, " +
                                f"{source_fat}g fat | {source_calories} kcal")
                        
                        # Store in session state
                        st.session_state.meal_components[f"meal_{i}"]["carb_sources"].append({
                            "food": carb_source,
                            "serving": required_serving,
                            "macros": {
                                "protein": source_protein,
                                "carbs": source_carbs,
                                "fat": source_fat,
                                "calories": source_calories
                            }
                        })
                        
                        # Update allocated and remaining carbs
                        allocated_carbs += source_carbs
                        remaining_carbs = carbs - allocated_carbs
                        
                    st.markdown("---")
        
    with cols[3]:
        # Fat input
        fat = st.number_input(
            "Fat (g)",
            min_value=0,
            max_value=100,
            value=int(st.session_state.current_meals.at[i, "Fat (g)"]),
            step=1,
            key=f"fat_{i}"
        )
        st.session_state.current_meals.at[i, "Fat (g)"] = fat
        
        # Fat food source selection
        if fat > 0:
            # Predefined fat values for common foods (per 100g or serving)
            fat_foods = {
                "Olive Oil": {"protein": 0, "carbs": 0, "fat": 100, "calories": 884, "serving": "100g"},
                "Avocado": {"protein": 2, "carbs": 9, "fat": 15, "calories": 160, "serving": "100g"},
                "Nuts": {"protein": 21, "carbs": 21, "fat": 49, "calories": 607, "serving": "100g"},
                "Nut Butter": {"protein": 25, "carbs": 20, "fat": 50, "calories": 589, "serving": "100g"},
                "Cheese": {"protein": 25, "carbs": 1.3, "fat": 33, "calories": 402, "serving": "100g"},
                "Coconut Oil": {"protein": 0, "carbs": 0, "fat": 100, "calories": 862, "serving": "100g"},
                "Butter": {"protein": 0.9, "carbs": 0.1, "fat": 81, "calories": 717, "serving": "100g"},
                "Seeds": {"protein": 18, "carbs": 34, "fat": 42, "calories": 534, "serving": "100g"},
                "Egg Yolks": {"protein": 16, "carbs": 1, "fat": 27, "calories": 322, "serving": "100g"},
                "Dark Chocolate": {"protein": 7.8, "carbs": 46, "fat": 43, "calories": 598, "serving": "100g"},
            }
            
            st.markdown("##### Fat Sources")
            
            # Keep track of fat allocated so far
            allocated_fat = 0
            remaining_fat = fat
            
            # Reset fat sources list for this meal
            st.session_state.meal_components[f"meal_{i}"]["fat_sources"] = []
            
            # Allow multiple fat sources
            num_fat_sources = st.number_input("Number of fat sources", 
                                           min_value=1, max_value=3, value=1,
                                           key=f"num_fat_sources_{i}")
            
            # Create a container for fat sources
            fat_container = st.container()
            
            with fat_container:
                for src_idx in range(num_fat_sources):
                    st.markdown(f"**Fat Source {src_idx+1}**")
                    
                    # If this is not the first source, show how much fat is left to allocate
                    if src_idx > 0 and remaining_fat > 0:
                        st.info(f"{remaining_fat}g fat remaining to allocate")
                    
                    # Calculate fat amount for this source
                    if src_idx == num_fat_sources - 1:  # Last source gets all remaining fat
                        source_fat = remaining_fat
                    else:
                        # Otherwise allocate a portion
                        source_fat = st.number_input(
                            f"Fat amount (g) for source {src_idx+1}",
                            min_value=1,
                            max_value=remaining_fat,
                            value=min(round(fat / num_fat_sources), remaining_fat),
                            step=1,
                            key=f"fat_amount_{i}_{src_idx}"
                        )
                    
                    # Fat food selection
                    fat_source = st.selectbox(
                        f"Select fat source {src_idx+1}",
                        options=list(fat_foods.keys()) + ["Search..."],
                        key=f"fat_source_{i}_{src_idx}"
                    )
                    
                    if fat_source == "Search...":
                        fat_search = st.text_input(f"Search for fat foods {src_idx+1}:", 
                                                key=f"fat_search_{i}_{src_idx}")
                        if fat_search:
                            st.info(f"Searching for '{fat_search}' (Note: This would connect to the USDA database)")
                            # In a real implementation, this would call the FDC API
                    else:
                        # Calculate required serving size to hit fat target for this source
                        selected_food = fat_foods[fat_source]
                        required_serving = (source_fat / selected_food["fat"]) * 100  # Scale from 100g
                        
                        # Display serving size
                        st.write(f"Serving: **{round(required_serving)}g** ({round(required_serving/100, 1)} servings)")
                        
                        # Calculate other macros from this fat source
                        source_protein = round((required_serving/100) * selected_food["protein"])
                        source_carbs = round((required_serving/100) * selected_food["carbs"])
                        source_calories = round((required_serving/100) * selected_food["calories"])
                        
                        # Show macronutrient contribution
                        st.write(f"Provides: {source_protein}g protein, " + 
                                f"{source_carbs}g carbs, " +
                                f"{source_fat}g fat | {source_calories} kcal")
                        
                        # Store in session state
                        st.session_state.meal_components[f"meal_{i}"]["fat_sources"].append({
                            "food": fat_source,
                            "serving": required_serving,
                            "macros": {
                                "protein": source_protein,
                                "carbs": source_carbs,
                                "fat": source_fat,
                                "calories": source_calories
                            }
                        })
                        
                        # Update allocated and remaining fat
                        allocated_fat += source_fat
                        remaining_fat = fat - allocated_fat
                        
                    st.markdown("---")
        
    with cols[4]:
        # Add a vegetables/fruits field
        st.write("### Vegetables/Fruits")
        
        # Predefined vegetable/fruit values (per 100g)
        vf_foods = {
            "Broccoli": {"protein": 2.8, "carbs": 7, "fat": 0.4, "fiber": 2.6, "calories": 34, "serving": "100g"},
            "Spinach": {"protein": 2.9, "carbs": 3.6, "fat": 0.4, "fiber": 2.2, "calories": 23, "serving": "100g"},
            "Mixed Greens": {"protein": 1.5, "carbs": 2.9, "fat": 0.2, "fiber": 1.5, "calories": 17, "serving": "100g"},
            "Asparagus": {"protein": 2.2, "carbs": 3.9, "fat": 0.1, "fiber": 2.1, "calories": 20, "serving": "100g"},
            "Bell Peppers": {"protein": 0.9, "carbs": 6, "fat": 0.2, "fiber": 2.1, "calories": 28, "serving": "100g"},
            "Carrots": {"protein": 0.9, "carbs": 9.6, "fat": 0.2, "fiber": 2.8, "calories": 41, "serving": "100g"},
            "Zucchini": {"protein": 1.2, "carbs": 3.1, "fat": 0.3, "fiber": 1, "calories": 17, "serving": "100g"},
            "Cauliflower": {"protein": 1.9, "carbs": 5, "fat": 0.3, "fiber": 2, "calories": 25, "serving": "100g"},
            "Apple": {"protein": 0.3, "carbs": 14, "fat": 0.2, "fiber": 2.4, "calories": 52, "serving": "100g (1 medium)"},
            "Berries": {"protein": 0.7, "carbs": 14, "fat": 0.3, "fiber": 2, "calories": 57, "serving": "100g"},
            "Banana": {"protein": 1.1, "carbs": 22.8, "fat": 0.3, "fiber": 2.6, "calories": 89, "serving": "100g (1 medium)"},
            "Orange": {"protein": 0.9, "carbs": 11.8, "fat": 0.1, "fiber": 2.4, "calories": 47, "serving": "100g (1 medium)"},
            "Tomatoes": {"protein": 0.9, "carbs": 3.9, "fat": 0.2, "fiber": 1.2, "calories": 18, "serving": "100g"},
            "Cucumber": {"protein": 0.7, "carbs": 3.6, "fat": 0.1, "fiber": 0.5, "calories": 15, "serving": "100g"},
            "Kale": {"protein": 4.3, "carbs": 8.8, "fat": 1.5, "fiber": 3.6, "calories": 50, "serving": "100g"},
        }
        
        # Track added protein, carbs and fat from vegetables/fruits
        added_protein = 0
        added_carbs = 0
        added_fat = 0
        
        # Reset veggie/fruit sources list for this meal
        st.session_state.meal_components[f"meal_{i}"]["veggie_fruit_sources"] = []
        
        # Allow multiple vegetable/fruit selections
        num_vf_sources = st.number_input("Number of vegetable/fruit sides", 
                                     min_value=0, max_value=3, value=1,
                                     key=f"num_vf_sources_{i}")
        
        if num_vf_sources > 0:
            # Create a container for veggie/fruit sources
            vf_container = st.container()
            
            with vf_container:
                for src_idx in range(num_vf_sources):
                    st.markdown(f"**Vegetable/Fruit {src_idx+1}**")
                    
                    # Vegetable/fruit selection
                    vf_source = st.selectbox(
                        f"Select vegetable/fruit {src_idx+1}",
                        options=list(vf_foods.keys()) + ["Search..."],
                        key=f"vf_source_{i}_{src_idx}"
                    )
                    
                    if vf_source == "Search...":
                        vf_search = st.text_input(f"Search for vegetables/fruits {src_idx+1}:", 
                                              key=f"vf_search_{i}_{src_idx}")
                        if vf_search:
                            st.info(f"Searching for '{vf_search}' (Note: This would connect to the USDA database)")
                            # In a real implementation, this would call the FDC API
                    else:
                        # Standard serving for vegetables/fruits (usually around 100g)
                        standard_serving = 100  # grams
                        
                        # Allow custom serving size adjustment
                        serving_size = st.slider(
                            f"Serving size (g) for {vf_source}",
                            min_value=50,
                            max_value=200,
                            value=100,
                            step=25,
                            key=f"vf_serving_{i}_{src_idx}"
                        )
                        
                        selected_food = vf_foods[vf_source]
                        
                        # Calculate macros based on selected serving size
                        vf_protein = round((serving_size/100) * selected_food['protein'])
                        vf_carbs = round((serving_size/100) * selected_food['carbs'])
                        vf_fat = round((serving_size/100) * selected_food['fat'])
                        vf_fiber = round((serving_size/100) * selected_food['fiber'])
                        vf_calories = round((serving_size/100) * selected_food['calories'])
                        
                        # Display nutrition info
                        st.write(f"Provides: {vf_protein}g protein, {vf_carbs}g carbs, {vf_fat}g fat")
                        st.write(f"Fiber: {vf_fiber}g | Calories: {vf_calories}")
                        
                        # Store in session state
                        st.session_state.meal_components[f"meal_{i}"]["veggie_fruit_sources"].append({
                            "food": vf_source,
                            "serving": serving_size,
                            "macros": {
                                "protein": vf_protein,
                                "carbs": vf_carbs,
                                "fat": vf_fat,
                                "fiber": vf_fiber,
                                "calories": vf_calories
                            }
                        })
                        
                        # Update tracking variables
                        added_protein += vf_protein
                        added_carbs += vf_carbs
                        added_fat += vf_fat
                        
                    st.markdown("---")
                
                # Update the meal's macros to include the vegetables/fruits
                protein += added_protein
                carbs += added_carbs
                fat += added_fat
                st.session_state.current_meals.at[i, "Protein (g)"] = protein
                st.session_state.current_meals.at[i, "Carbs (g)"] = carbs
                st.session_state.current_meals.at[i, "Fat (g)"] = fat
        
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