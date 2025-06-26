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
    page_title="Fitomics - Weekly Schedule",
    page_icon="📅",
    layout="wide"
)

# Setup page header with Fitomics branding
st.title("📅 Weekly Schedule")
st.markdown("Create a comprehensive weekly schedule that helps optimize meal planning by understanding when and where you'll be eating throughout the week.")

# Initialize session state for schedule if needed
if 'weekly_schedule_v2' not in st.session_state:
    st.session_state.weekly_schedule_v2 = {}

# Define days of the week for consistent use
days_of_week = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

# SECTION 1: Basic Schedule Setup
st.header("⏰ Basic Schedule Setup")

col1, col2 = st.columns(2)

with col1:
    st.subheader("Sleep Schedule")
    wake_time = st.time_input("Wake Up Time", value=datetime.time(7, 0), key="wake_time_input")
    bed_time = st.time_input("Bed Time", value=datetime.time(22, 30), key="bed_time_input")
    
    # Calculate sleep duration
    def calculate_sleep_hours(wake, bed):
        wake_minutes = wake.hour * 60 + wake.minute
        bed_minutes = bed.hour * 60 + bed.minute
        
        if bed_minutes < wake_minutes:  # Sleep crosses midnight
            bed_minutes += 24 * 60
        
        sleep_minutes = bed_minutes - wake_minutes
        return sleep_minutes / 60
    
    sleep_hours = calculate_sleep_hours(wake_time, bed_time)
    
    if sleep_hours < 7:
        st.warning(f"⚠️ {sleep_hours:.1f} hours of sleep - consider getting 7-9 hours for optimal recovery")
    else:
        st.success(f"✅ {sleep_hours:.1f} hours of sleep - excellent for recovery and health")

with col2:
    st.subheader("Work Schedule")
    work_type = st.selectbox("Work Type", [
        "Remote Work",
        "Office Work", 
        "Hybrid Work",
        "Shift Work",
        "Travel Work",
        "Student",
        "Retired/Unemployed"
    ], key="work_type_select")
    
    if work_type not in ["Retired/Unemployed"]:
        work_start = st.time_input("Work Start Time", value=datetime.time(9, 0), key="work_start_input")
        work_end = st.time_input("Work End Time", value=datetime.time(17, 0), key="work_end_input")
        
        work_hours = calculate_sleep_hours(work_start, work_end)
        st.info(f"📋 {work_hours:.1f} hour work day")
    else:
        work_start = work_end = None

# SECTION 2: Activity Schedule
st.header("🏃‍♀️ Weekly Activity Schedule")

activity_col1, activity_col2 = st.columns(2)

with activity_col1:
    st.subheader("Workout Schedule")
    
    # Simplified workout setup
    total_workouts = st.number_input("Total workouts per week", min_value=0, max_value=14, value=4, key="total_workouts")
    
    if total_workouts > 0:
        workout_duration = st.slider("Average workout duration (minutes)", 30, 180, 60, step=15, key="workout_duration")
        workout_intensity = st.selectbox("Average workout intensity", 
                                       ["Light", "Moderate", "High", "Very High"], 
                                       index=2, key="workout_intensity")
        
        # Let users select which days they want to work out
        workout_days = st.multiselect(
            "Select workout days",
            days_of_week,
            default=days_of_week[:min(total_workouts, 7)],
            help="You can select the same day multiple times for multiple workouts",
            key="workout_days_select"
        )
        
        if len(workout_days) != total_workouts and total_workouts <= 7:
            st.warning(f"Please select exactly {total_workouts} days for your workouts")

with activity_col2:
    st.subheader("Activity Level")
    
    base_activity = st.selectbox("Daily activity level (outside workouts)", [
        "Sedentary (desk job, minimal movement)",
        "Lightly Active (some walking, light daily activities)", 
        "Moderately Active (regular walking, active lifestyle)",
        "Very Active (lots of movement, physical job)"
    ], index=1, key="base_activity_select")
    
    # Convert to simple labels for calculations
    activity_mapping = {
        "Sedentary (desk job, minimal movement)": "Sedentary",
        "Lightly Active (some walking, light daily activities)": "Lightly Active",
        "Moderately Active (regular walking, active lifestyle)": "Moderately Active", 
        "Very Active (lots of movement, physical job)": "Very Active"
    }
    activity_level = activity_mapping[base_activity]

# SECTION 3: Meal Planning Context
st.header("🍽️ Meal Planning Context")

# Get meal frequency from diet preferences
if 'diet_preferences' in st.session_state and 'meal_frequency' in st.session_state.diet_preferences:
    meals_per_day = st.session_state.diet_preferences['meal_frequency']
    st.info(f"Using {meals_per_day} meals per day from your Diet Preferences")
else:
    meals_per_day = st.number_input("Meals per day", min_value=2, max_value=8, value=3, key="meals_per_day_input")

# Meal context options for better meal planning
st.subheader("Default Meal Contexts")
st.write("Set default contexts for each meal to help with meal planning and preparation")

# Create meal context inputs
meal_contexts = {}
meal_names = ["Breakfast", "Lunch", "Dinner", "Snack 1", "Snack 2", "Snack 3", "Snack 4", "Snack 5"]

context_options = [
    "Home Cooking", "Meal Prep", "Restaurant/Dining Out", 
    "Takeout/Delivery", "On-the-Go/Portable", "Office/Work",
    "Post-Workout", "Pre-Workout", "Social Eating",
    "Quick & Easy", "Healthy Snack", "Family Meal"
]

context_cols = st.columns(min(meals_per_day, 3))

for i in range(meals_per_day):
    meal_name = meal_names[i] if i < len(meal_names) else f"Meal {i+1}"
    col_idx = i % len(context_cols)
    
    with context_cols[col_idx]:
        meal_contexts[meal_name] = st.selectbox(
            f"{meal_name} Context",
            context_options,
            key=f"meal_context_{i}",
            help="This helps determine meal suggestions and preparation methods"
        )

# SECTION 4: Generate Schedule
st.header("📊 Generate Your Weekly Schedule")

if st.button("Generate Complete Weekly Schedule", type="primary", key="generate_schedule"):
    # Clear existing schedule
    st.session_state.weekly_schedule_v2 = {}
    
    # Calculate base metabolic values
    user_info = st.session_state.get('user_info', {})
    weight_kg = user_info.get('weight_kg', 70)
    height_cm = user_info.get('height_cm', 175)
    age = user_info.get('age', 30)
    gender = user_info.get('gender', 'Male')
    
    # Calculate BMR
    bmr = utils.calculate_bmr(gender, weight_kg, height_cm, age)
    
    # Activity multipliers
    activity_multipliers = {
        "Sedentary": 1.2,
        "Lightly Active": 1.375,
        "Moderately Active": 1.55,
        "Very Active": 1.725
    }
    
    # Workout calorie estimates
    intensity_cals_per_min = {
        "Light": 5.0,
        "Moderate": 7.5,
        "High": 10.0,
        "Very High": 12.5
    }
    
    # Generate schedule for each day
    for i, day in enumerate(days_of_week):
        # Determine if this is a workout day
        is_workout_day = day in workout_days if total_workouts > 0 else False
        
        # Calculate TDEE for the day
        base_tdee = bmr * activity_multipliers.get(activity_level, 1.375)
        
        # Add workout calories if it's a workout day
        workout_calories = 0
        if is_workout_day and total_workouts > 0:
            workout_calories = workout_duration * intensity_cals_per_min.get(workout_intensity, 7.5)
        
        day_tdee = int(base_tdee + workout_calories)
        
        # Create day schedule
        day_schedule = {
            "wake_time": wake_time.strftime("%H:%M"),
            "bed_time": bed_time.strftime("%H:%M"),
            "sleep_hours": round(sleep_hours, 1),
            "work_start": work_start.strftime("%H:%M") if work_start else None,
            "work_end": work_end.strftime("%H:%M") if work_end else None,
            "work_type": work_type,
            "has_workout": is_workout_day,
            "workout_duration": workout_duration if is_workout_day else 0,
            "workout_intensity": workout_intensity if is_workout_day else None,
            "activity_level": activity_level,
            "estimated_tdee": day_tdee,
            "meals": [],
            "meal_contexts": meal_contexts.copy()
        }
        
        # Add suggested meal times based on schedule
        meal_times = []
        if meals_per_day == 2:
            meal_times = ["08:00", "18:00"]
        elif meals_per_day == 3:
            meal_times = ["07:30", "12:30", "18:30"]
        elif meals_per_day == 4:
            meal_times = ["07:00", "10:00", "13:00", "18:00"]
        elif meals_per_day == 5:
            meal_times = ["07:00", "10:00", "13:00", "16:00", "19:00"]
        elif meals_per_day == 6:
            meal_times = ["07:00", "09:30", "12:00", "15:00", "17:30", "20:00"]
        else:
            # Generate evenly spaced meal times
            start_hour = wake_time.hour + 1
            end_hour = bed_time.hour - 1
            meal_times = []
            for j in range(meals_per_day):
                hour = start_hour + (j * (end_hour - start_hour) // (meals_per_day - 1))
                meal_times.append(f"{hour:02d}:00")
        
        # Add meals to schedule
        for j in range(meals_per_day):
            meal_name = meal_names[j] if j < len(meal_names) else f"Meal {j+1}"
            meal_time = meal_times[j] if j < len(meal_times) else "12:00"
            
            day_schedule["meals"].append({
                "name": meal_name,
                "time": meal_time,
                "context": meal_contexts.get(meal_name, "Home Cooking")
            })
        
        st.session_state.weekly_schedule_v2[day] = day_schedule
    
    st.success("✅ Weekly schedule generated successfully!")

# SECTION 5: Schedule Overview
if st.session_state.weekly_schedule_v2:
    st.header("📅 Your Weekly Schedule")
    
    # Create a comprehensive weekly overview
    schedule_data = []
    
    for day in days_of_week:
        day_data = st.session_state.weekly_schedule_v2.get(day, {})
        
        # Work schedule display
        if day_data.get("work_start") and day_data.get("work_end"):
            work_display = f"{day_data['work_start']} - {day_data['work_end']}"
        else:
            work_display = "No work"
        
        # Workout display  
        workout_display = "Rest Day"
        if day_data.get("has_workout"):
            workout_display = f"{day_data.get('workout_duration', 0)}min {day_data.get('workout_intensity', '')}"
        
        # Meal times display
        meals = day_data.get("meals", [])
        meal_display = " | ".join([f"{meal['time']} {meal['name']}" for meal in meals[:3]])
        if len(meals) > 3:
            meal_display += f" | +{len(meals)-3} more"
        
        schedule_data.append({
            "Day": day,
            "Sleep": f"{day_data.get('wake_time', '')} - {day_data.get('bed_time', '')} ({day_data.get('sleep_hours', 0)}h)",
            "Work": work_display,
            "Workout": workout_display,
            "Meals": meal_display,
            "Est. TDEE": f"{day_data.get('estimated_tdee', 0)} cal"
        })
    
    # Display schedule table
    df = pd.DataFrame(schedule_data)
    st.dataframe(df, use_container_width=True, hide_index=True)
    
    # Daily detail expander
    with st.expander("📋 Daily Schedule Details"):
        selected_day = st.selectbox("View detailed schedule for:", days_of_week, key="day_detail_select")
        
        if selected_day in st.session_state.weekly_schedule_v2:
            day_detail = st.session_state.weekly_schedule_v2[selected_day]
            
            st.subheader(f"{selected_day} Schedule")
            
            detail_col1, detail_col2 = st.columns(2)
            
            with detail_col1:
                st.write("**Daily Overview:**")
                st.write(f"• Wake up: {day_detail.get('wake_time', 'N/A')}")
                st.write(f"• Sleep: {day_detail.get('sleep_hours', 0)} hours")
                st.write(f"• Work: {day_detail.get('work_type', 'N/A')}")
                if day_detail.get('work_start'):
                    st.write(f"• Work hours: {day_detail['work_start']} - {day_detail['work_end']}")
                st.write(f"• Activity level: {day_detail.get('activity_level', 'N/A')}")
                if day_detail.get('has_workout'):
                    st.write(f"• Workout: {day_detail.get('workout_duration', 0)} min ({day_detail.get('workout_intensity', 'N/A')})")
                st.write(f"• Estimated TDEE: {day_detail.get('estimated_tdee', 0)} calories")
            
            with detail_col2:
                st.write("**Meal Schedule:**")
                meals = day_detail.get('meals', [])
                for meal in meals:
                    st.write(f"• {meal['time']} - {meal['name']} ({meal['context']})")
    
    # Save schedule and proceed
    st.markdown("---")
    if st.button("Save Schedule & Continue to Nutrition Targets", type="primary", key="save_schedule"):
        # Convert to the format expected by other parts of the app
        st.session_state.confirmed_weekly_schedule = copy.deepcopy(st.session_state.weekly_schedule_v2)
        
        # Calculate day-specific TDEE values
        day_tdee_values = {}
        for day in days_of_week:
            day_data = st.session_state.weekly_schedule_v2.get(day, {})
            day_tdee_values[day] = day_data.get('estimated_tdee', 2000)
        st.session_state.day_tdee_values = day_tdee_values
        
        st.success("✅ Schedule saved! You can now proceed to Nutrition Targets to set your daily nutrition goals based on this schedule.")
        st.balloons()

else:
    st.info("👆 Please generate your weekly schedule using the form above to see your personalized schedule overview.")

# Add helpful tips
st.markdown("---")
st.markdown("### 💡 Tips for Better Meal Planning")
st.markdown("""
- **Home Cooking**: Plan prep time and grocery shopping
- **Meal Prep**: Best for consistent schedules and batch cooking  
- **Restaurant/Dining Out**: Factor in social meals and budget
- **On-the-Go**: Focus on portable, convenient options
- **Post-Workout**: Emphasize protein and recovery nutrition
- **Office/Work**: Consider storage and heating options
""")