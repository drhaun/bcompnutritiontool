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

# SECTION 1: General Daily Schedule
st.header("⏰ General Daily Schedule")
st.markdown("These settings reflect a routine day and routine work day. If desired, more detailed customization can occur in subsequent steps.")

col1, col2 = st.columns(2)

with col1:
    st.subheader("Sleep Schedule")
    wake_time = st.time_input("Wake Up Time", value=datetime.time(7, 0), key="wake_time_input")
    bed_time = st.time_input("Bed Time", value=datetime.time(22, 30), key="bed_time_input")
    
    # Calculate sleep duration
    def calculate_sleep_hours(wake, bed):
        wake_minutes = wake.hour * 60 + wake.minute
        bed_minutes = bed.hour * 60 + bed.minute
        
        # Sleep typically crosses midnight (bedtime is night before wake time)
        # So we calculate from bedtime to wake time the next day
        if bed_minutes > wake_minutes:  # Normal case: bed after wake means sleep crosses midnight
            sleep_minutes = (24 * 60) - bed_minutes + wake_minutes
        else:  # Edge case: bed before wake on same day (unusual but possible)
            sleep_minutes = wake_minutes - bed_minutes
            
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
        
        # Calculate work hours (different logic than sleep)
        work_start_minutes = work_start.hour * 60 + work_start.minute
        work_end_minutes = work_end.hour * 60 + work_end.minute
        
        if work_end_minutes < work_start_minutes:  # Work crosses midnight
            work_hours = ((24 * 60) - work_start_minutes + work_end_minutes) / 60
        else:  # Normal work day
            work_hours = (work_end_minutes - work_start_minutes) / 60
        st.info(f"📋 {work_hours:.1f} hour work day")
    else:
        work_start = work_end = None

# SECTION 2: General Weekly Activity Schedule
st.header("🏃‍♀️ General Weekly Activity Schedule")

activity_col1, activity_col2 = st.columns(2)

with activity_col1:
    st.subheader("Workout Schedule")
    
    # Check if user does multiple workouts per day
    multiple_workouts_per_day = st.checkbox("I sometimes do multiple workouts per day", value=False, key="multiple_workouts_per_day")
    
    if not multiple_workouts_per_day:
        # Single workout per day setup with detailed configuration
        total_workouts = st.number_input("Total workouts per week", min_value=0, max_value=7, value=4, key="total_workouts")
        
        if total_workouts > 0:
            workout_days = st.multiselect(
                "Select workout days",
                days_of_week,
                default=days_of_week[:min(total_workouts, 7)],
                key="workout_days_select"
            )
            
            if len(workout_days) != total_workouts:
                st.warning(f"Please select exactly {total_workouts} days for your workouts")
            
            # Initialize single workout schedule in session state
            if 'single_workout_schedule' not in st.session_state:
                st.session_state.single_workout_schedule = {}
            
            # Configure each selected workout day
            if workout_days:
                st.write("**Configure each workout day:**")
                
                for day in workout_days:
                    with st.expander(f"**{day}** Workout Details", expanded=False):
                        day_key = day.lower()
                        
                        workout_col1, workout_col2 = st.columns(2)
                        
                        with workout_col1:
                            workout_type = st.selectbox(
                                "Workout type",
                                ["Resistance Training", "Cardio", "Mixed/Cross-Training", "Sports", "Yoga/Flexibility"],
                                index=0,
                                key=f"single_workout_type_{day_key}"
                            )
                            
                            workout_time = st.selectbox(
                                "Workout time",
                                [
                                    "Early Morning (5:00-8:00 AM)",
                                    "Morning (8:00-11:00 AM)", 
                                    "Midday (11:00 AM-2:00 PM)",
                                    "Afternoon (2:00-5:00 PM)",
                                    "Evening (5:00-8:00 PM)",
                                    "Night (8:00-11:00 PM)"
                                ],
                                index=4,
                                key=f"single_workout_time_{day_key}"
                            )
                        
                        with workout_col2:
                            workout_duration = st.slider(
                                "Duration (minutes)",
                                30, 180, 60, step=15,
                                key=f"single_workout_duration_{day_key}"
                            )
                            
                            workout_intensity = st.selectbox(
                                "Intensity",
                                ["Light", "Moderate", "High", "Very High"],
                                index=2,
                                key=f"single_workout_intensity_{day_key}"
                            )
                        
                        # Store workout details for this day
                        st.session_state.single_workout_schedule[day] = {
                            'type': workout_type,
                            'time': workout_time,
                            'duration': workout_duration,
                            'intensity': workout_intensity
                        }
            
    else:
        # Advanced multiple workouts per day setup
        st.write("**Configure your weekly workout schedule:**")
        
        # Initialize workout schedule in session state
        if 'detailed_workout_schedule' not in st.session_state:
            st.session_state.detailed_workout_schedule = {}
        
        # For each day of the week, let user configure workouts
        for day in days_of_week:
            with st.expander(f"**{day}** Workouts", expanded=False):
                day_key = day.lower()
                
                # Number of workouts for this day
                num_workouts = st.number_input(
                    f"Number of workouts on {day}",
                    min_value=0, max_value=3, value=0,
                    key=f"num_workouts_{day_key}"
                )
                
                if num_workouts > 0:
                    day_workouts = []
                    
                    for workout_num in range(num_workouts):
                        st.write(f"**Workout {workout_num + 1}:**")
                        
                        workout_col1, workout_col2 = st.columns(2)
                        
                        with workout_col1:
                            workout_type = st.selectbox(
                                "Type",
                                ["Resistance Training", "Cardio", "Mixed/Cross-Training", "Sports", "Yoga/Flexibility"],
                                key=f"workout_type_{day_key}_{workout_num}"
                            )
                            
                            workout_time = st.selectbox(
                                "Time",
                                [
                                    "Early Morning (5:00-8:00 AM)",
                                    "Morning (8:00-11:00 AM)", 
                                    "Midday (11:00 AM-2:00 PM)",
                                    "Afternoon (2:00-5:00 PM)",
                                    "Evening (5:00-8:00 PM)",
                                    "Night (8:00-11:00 PM)"
                                ],
                                key=f"workout_time_{day_key}_{workout_num}"
                            )
                        
                        with workout_col2:
                            workout_duration = st.slider(
                                "Duration (min)",
                                15, 180, 60, step=15,
                                key=f"workout_duration_{day_key}_{workout_num}"
                            )
                            
                            workout_intensity = st.selectbox(
                                "Intensity",
                                ["Light", "Moderate", "High", "Very High"],
                                index=2,
                                key=f"workout_intensity_{day_key}_{workout_num}"
                            )
                        
                        day_workouts.append({
                            'type': workout_type,
                            'time': workout_time,
                            'duration': workout_duration,
                            'intensity': workout_intensity
                        })
                        
                        if workout_num < num_workouts - 1:
                            st.divider()
                    
                    st.session_state.detailed_workout_schedule[day] = day_workouts
                else:
                    st.session_state.detailed_workout_schedule[day] = []
    
    # General workout preferences (applies to both single and multiple workout setups)
    st.subheader("Workout Preferences")
    avoid_bedtime_workouts = st.checkbox("Avoid workouts within 3 hours of bedtime", value=True, key="avoid_bedtime_workouts")
    allow_fasted_workouts = st.checkbox("Allow fasted morning workouts", value=False, key="allow_fasted_workouts")

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

meal_col1, meal_col2 = st.columns(2)

with meal_col1:
    # User selects preferred number of meals per day
    meals_per_day = st.number_input("Preferred # of meals per day", min_value=2, max_value=8, value=3, key="meals_per_day_input")

with meal_col2:
    # Add snacks per day
    snacks_per_day = st.number_input("Preferred # of snacks per day", min_value=0, max_value=5, value=2, key="snacks_per_day_input")

# Description of meal vs snack difference
st.markdown("""
**Difference between Meals and Snacks:**

**Meal:** A larger, more structured eating occasion typically intended to provide significant nourishment and satiety, often including multiple food groups (e.g., protein, carbs, fats) and consumed at standard times (e.g., breakfast, lunch, dinner).

**Snack:** A smaller, less formal intake of food meant to bridge hunger between meals, usually lower in calories and often more convenient or portable.

**Key differences:**
- **Size:** Meals are larger; snacks are smaller
- **Purpose:** Meals sustain; snacks tide you over  
- **Timing:** Meals are planned; snacks are flexible
""")

# Enhanced Meal Context Builder
st.subheader("🍽️ Meal Context Builder")
st.write("Answer a few simple questions for each meal to create personalized meal planning contexts.")

# Initialize meal contexts storage
if 'meal_contexts_detailed' not in st.session_state:
    st.session_state.meal_contexts_detailed = {}

# Create detailed meal context inputs
meal_contexts = {}
meal_names = ["First Meal", "Second Meal", "Third Meal", "Fourth Meal", "Fifth Meal", "Sixth Meal", "Seventh Meal", "Eighth Meal"]
snack_names = ["First Snack", "Second Snack", "Third Snack", "Fourth Snack", "Fifth Snack"]

# Process meals
for i in range(meals_per_day):
    meal_name = f"{meal_names[i]} of Day"
    meal_key = f"meal_{i+1}"
    
    with st.expander(f"🍽️ **{meal_name}** Configuration", expanded=False):
        
        # 1. Meal Prep Preference
        st.write("**How would you prefer to prepare this meal most days?**")
        prep_type = st.radio(
            "Preparation method:",
            options=[
                "🧑‍🍳 Cook from scratch",
                "🍱 Use leftovers/pre-prepped ingredients", 
                "🥡 Pickup or takeout",
                "🚚 Meal delivery (ready-to-eat)",
                "❌ Skip this meal most days"
            ],
            key=f"prep_type_{meal_key}",
            horizontal=True
        )
        
        # Conditional prep time question
        prep_time = None
        if prep_type in ["🧑‍🍳 Cook from scratch", "🍱 Use leftovers/pre-prepped ingredients"]:
            st.write("**How much time would you typically like to spend preparing this meal?**")
            prep_time = st.radio(
                "Preparation time:",
                options=["⏱️ <5 minutes", "⏱️ 5–15 minutes", "⏱️ 15–30 minutes", "⏱️ 30+ minutes"],
                key=f"prep_time_{meal_key}",
                horizontal=True
            )
        
        # 2. Location
        st.write("**Where do you typically eat this meal?**")
        location = st.multiselect(
            "Location(s):",
            options=["🏠 At home", "🧑‍💼 At work", "🍽️ At a restaurant", "🚗 On-the-go (in transit, gym, car, etc.)"],
            key=f"location_{meal_key}",
            help="Select one or multiple locations"
        )
        
        # 3. Time range
        st.write("**What time do you typically eat this meal?**")
        time_range_options = [
            "Early Morning (5:00-8:00 AM)",
            "Morning (8:00-11:00 AM)", 
            "Midday (11:00 AM-2:00 PM)",
            "Afternoon (2:00-5:00 PM)",
            "Evening (5:00-8:00 PM)",
            "Night (8:00-11:00 PM)"
        ]
        time_range = st.selectbox(
            "Typical time range:",
            time_range_options,
            index=min(i, len(time_range_options)-1),
            key=f"time_range_{meal_key}"
        )
        
        # 4. Consistency check
        st.write("**Is this your usual routine for this meal most days?**")
        col1, col2 = st.columns([1, 3])
        with col1:
            is_consistent = st.toggle("Consistent routine", value=True, key=f"consistent_{meal_key}")
        
        with col2:
            variations = None
            if not is_consistent:
                variations = st.text_input(
                    "Describe variations:",
                    placeholder="e.g., weekends differ, travel days, social events...",
                    key=f"variations_{meal_key}"
                )
        
        # Store detailed context
        st.session_state.meal_contexts_detailed[meal_key] = {
            "meal": meal_name,
            "prep_type": prep_type.split(" ", 1)[1] if prep_type else None,  # Remove emoji
            "prep_time": prep_time.split(" ", 1)[1] if prep_time else None,  # Remove emoji
            "location": [loc.split(" ", 1)[1] for loc in location] if location else [],  # Remove emojis
            "time_range": time_range,
            "consistency": is_consistent,
            "variations": variations
        }
        
        # Create simplified context for backward compatibility
        if prep_type == "🧑‍🍳 Cook from scratch":
            context = "Home Cooking"
        elif prep_type == "🍱 Use leftovers/pre-prepped ingredients":
            context = "Meal Prep"
        elif prep_type == "🥡 Pickup or takeout":
            context = "Restaurant/Dining Out"
        elif prep_type == "🚚 Meal delivery (ready-to-eat)":
            context = "Takeout/Delivery"
        elif prep_type == "❌ Skip this meal most days":
            context = "Skip Meal"
        else:
            context = "Home Cooking"
            
        # Override context based on location for work meals
        if "🧑‍💼 At work" in location:
            context = "Office/Work"
        elif "🚗 On-the-go (in transit, gym, car, etc.)" in location:
            context = "On-the-Go/Portable"
            
        meal_contexts[meal_name] = context

# Process snacks
for i in range(snacks_per_day):
    snack_name = f"{snack_names[i]} of Day"
    snack_key = f"snack_{i+1}"
    
    with st.expander(f"🥨 **{snack_name}** Configuration", expanded=False):
        
        # Simplified snack configuration
        st.write("**How do you typically handle this snack?**")
        snack_type = st.radio(
            "Snack approach:",
            options=[
                "🏠 Prepare at home",
                "🏪 Buy ready-made", 
                "🧑‍💼 Office/work snack",
                "🏃‍♀️ Pre/post workout",
                "❌ Skip this snack most days"
            ],
            key=f"snack_type_{snack_key}",
            horizontal=True
        )
        
        # Snack timing
        snack_time_range = st.selectbox(
            "Typical time:",
            time_range_options,
            index=min(i+1, len(time_range_options)-1),
            key=f"snack_time_range_{snack_key}"
        )
        
        # Store snack context
        st.session_state.meal_contexts_detailed[snack_key] = {
            "meal": snack_name,
            "prep_type": snack_type.split(" ", 1)[1] if snack_type else None,
            "time_range": snack_time_range,
            "consistency": True  # Snacks are generally more consistent
        }
        
        # Create simplified context for backward compatibility
        if snack_type == "🏠 Prepare at home":
            context = "Healthy Snack"
        elif snack_type == "🏪 Buy ready-made":
            context = "Quick & Easy"
        elif snack_type == "🧑‍💼 Office/work snack":
            context = "Office/Work"
        elif snack_type == "🏃‍♀️ Pre/post workout":
            context = "Pre-Workout"  # Will be refined during schedule generation
        elif snack_type == "❌ Skip this snack most days":
            context = "Skip Snack"
        else:
            context = "Healthy Snack"
            
        meal_contexts[snack_name] = context

# Show smart recommendations
with st.expander("🧠 Smart Meal Context Tips", expanded=False):
    st.markdown("""
    **Smart defaults applied:**
    - Work meals automatically suggest portable/office-friendly options
    - Morning meals prioritize quick preparation
    - Evening meals allow more cooking time
    - Post-workout timing optimizes for recovery nutrition
    
    **Meal planning benefits:**
    - AI meal plans consider your prep time and location constraints
    - Grocery lists organize by preparation method
    - Recipe complexity matches your available time
    - Context-aware nutrition timing around workouts
    """)

# SECTION 4: Nutrient Timing Planner
st.header("🧠 Nutrient Timing Planner")

timing_col1, timing_col2 = st.columns(2)

with timing_col1:
    st.subheader("Workout Nutrition Preferences")
    
    # Pre/post workout meal preferences
    pre_workout_meal = st.checkbox("Include pre-workout meal", value=True, key="pre_workout_meal")
    pre_workout_snack = st.checkbox("Include pre-workout snack", value=False, key="pre_workout_snack")
    post_workout_meal = st.checkbox("Include post-workout meal within 2 hours", value=True, key="post_workout_meal")
    
    st.info("These preferences help optimize nutrition timing around your workouts for better performance and recovery.")

with timing_col2:
    st.subheader("Energy Management")
    
    energy_management = st.selectbox(
        "Energy distribution preference",
        ["Steady energy throughout day", "Higher energy for workouts", "Higher energy for work/focus"],
        key="energy_management"
    )
    
    # Liquid calories preference
    liquid_calories = st.selectbox(
        "Liquid calories preference",
        ["Minimize liquid calories", "Allow some liquid calories", "Open to liquid calories"],
        key="liquid_calories"
    )

# Generate schedule button
st.divider()
if st.button("📅 Generate Schedule", type="primary", use_container_width=True, key="generate_schedule"):
    with st.spinner("Generating your personalized weekly schedule..."):
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
        for day in days_of_week:
            # Get workout info for this day
            workout_info = []
            total_workout_calories = 0
            
            # Check if multiple workouts per day
            if multiple_workouts_per_day and 'detailed_workout_schedule' in st.session_state:
                day_workouts = st.session_state.detailed_workout_schedule.get(day, [])
                if day_workouts:
                    workout_info = day_workouts
                    # Calculate total workout calories for the day
                    for workout in day_workouts:
                        duration = workout.get('duration', 60)
                        intensity = workout.get('intensity', 'Moderate')
                        total_workout_calories += duration * intensity_cals_per_min.get(intensity, 7.5)
            else:
                # Single workout mode
                if 'single_workout_schedule' in st.session_state and day in st.session_state.single_workout_schedule:
                    workout_info = [st.session_state.single_workout_schedule[day]]
                    workout = workout_info[0]
                    duration = workout.get('duration', 60)
                    intensity = workout.get('intensity', 'Moderate')
                    total_workout_calories = duration * intensity_cals_per_min.get(intensity, 7.5)
            
            # Calculate TDEE for the day
            base_tdee = bmr * activity_multipliers.get(activity_level, 1.375)
            day_tdee = int(base_tdee + total_workout_calories)
            
            # Create meal structure for the day
            day_meals = []
            meal_ordinals = ["First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Eighth"]
            snack_ordinals = ["First", "Second", "Third", "Fourth", "Fifth"]
            
            # Add meals
            for i in range(meals_per_day):
                meal_name = f"{meal_ordinals[i]} Meal of Day"
                context = meal_contexts.get(meal_name, "Home Cooking")
                day_meals.append({
                    'type': 'meal',
                    'name': meal_name,
                    'context': context,
                    'calories': int(day_tdee // (meals_per_day + snacks_per_day) * 1.2)  # Meals get more calories
                })
            
            # Add snacks
            for i in range(snacks_per_day):
                snack_name = f"{snack_ordinals[i]} Snack of Day"
                context = meal_contexts.get(snack_name, "Healthy Snack")
                day_meals.append({
                    'type': 'snack',
                    'name': snack_name,
                    'context': context,
                    'calories': int(day_tdee // (meals_per_day + snacks_per_day) * 0.8)  # Snacks get fewer calories
                })
            
            # Store day schedule with enhanced meal contexts
            st.session_state.weekly_schedule_v2[day] = {
                'meals': day_meals,
                'workouts': workout_info,
                'total_calories': day_tdee,
                'base_tdee': int(base_tdee),
                'workout_calories': int(total_workout_calories),
                'sleep_schedule': {
                    'wake_time': wake_time.strftime('%H:%M'),
                    'bed_time': bed_time.strftime('%H:%M'),
                    'sleep_hours': sleep_hours
                },
                'work_schedule': {
                    'start_time': work_start.strftime('%H:%M') if work_start else None,
                    'end_time': work_end.strftime('%H:%M') if work_end else None,
                    'type': work_type
                },
                'preferences': {
                    'pre_workout_meal': pre_workout_meal,
                    'pre_workout_snack': pre_workout_snack,
                    'post_workout_meal': post_workout_meal,
                    'energy_management': energy_management,
                    'liquid_calories': liquid_calories
                },
                'detailed_meal_contexts': st.session_state.meal_contexts_detailed
            }
        
        st.success("✅ Weekly schedule generated successfully! Your personalized schedule considers your sleep, work, workout timing, and meal preferences.")

# SECTION 5: Schedule Overview
if st.session_state.weekly_schedule_v2:
    st.header("📅 Your Weekly Schedule")
    
    # Create a comprehensive weekly overview
    schedule_data = []
    
    for day in days_of_week:
        day_data = st.session_state.weekly_schedule_v2.get(day, {})
        
        # Work schedule display
        work_schedule = day_data.get('work_schedule', {})
        if work_schedule.get('start_time') and work_schedule.get('end_time'):
            work_display = f"{work_schedule['start_time']} - {work_schedule['end_time']}"
        else:
            work_display = "No work"
        
        # Workout display
        workouts = day_data.get('workouts', [])
        if workouts:
            if len(workouts) == 1:
                workout = workouts[0]
                workout_display = f"{workout.get('duration', 0)}min {workout.get('type', 'Workout')}"
            else:
                workout_display = f"{len(workouts)} workouts"
        else:
            workout_display = "Rest Day"
        
        # Meal count display
        meals = day_data.get('meals', [])
        meal_count = len([m for m in meals if m.get('type') == 'meal'])
        snack_count = len([m for m in meals if m.get('type') == 'snack'])
        meal_display = f"{meal_count} meals, {snack_count} snacks"
        
        # Sleep display
        sleep_schedule = day_data.get('sleep_schedule', {})
        sleep_display = f"{sleep_schedule.get('wake_time', '')} - {sleep_schedule.get('bed_time', '')} ({sleep_schedule.get('sleep_hours', 0):.1f}h)"
        
        schedule_data.append({
            "Day": day,
            "Sleep": sleep_display,
            "Work": work_display,
            "Workout": workout_display,
            "Meals": meal_display,
            "TDEE (calories)": f"{day_data.get('total_calories', 0)} cal"
        })
    
    # Display schedule table
    df = pd.DataFrame(schedule_data)
    st.dataframe(df, use_container_width=True, hide_index=True)
    
    # Explanation of TDEE
    st.info("💡 **TDEE (Total Daily Energy Expenditure)** is an estimate of how many calories your body burns in a day based on your basal metabolic rate, activity level, and planned workouts. This helps calculate your nutrition targets - for fat loss you'll eat below TDEE, for muscle gain above TDEE, and at TDEE to maintain weight.")
    
    # Daily detail expander
    with st.expander("📋 Daily Schedule Details"):
        selected_day = st.selectbox("View detailed schedule for:", days_of_week, key="day_detail_select")
        
        if selected_day in st.session_state.weekly_schedule_v2:
            day_detail = st.session_state.weekly_schedule_v2[selected_day]
            
            st.subheader(f"{selected_day} Schedule")
            
            detail_col1, detail_col2 = st.columns(2)
            
            with detail_col1:
                st.write("**Daily Overview:**")
                sleep_schedule = day_detail.get('sleep_schedule', {})
                work_schedule = day_detail.get('work_schedule', {})
                
                st.write(f"• Wake up: {sleep_schedule.get('wake_time', 'N/A')}")
                st.write(f"• Sleep: {sleep_schedule.get('sleep_hours', 0):.1f} hours")
                st.write(f"• Work type: {work_schedule.get('type', 'N/A')}")
                if work_schedule.get('start_time'):
                    st.write(f"• Work hours: {work_schedule['start_time']} - {work_schedule['end_time']}")
                
                workouts = day_detail.get('workouts', [])
                if workouts:
                    st.write("**Workouts:**")
                    for i, workout in enumerate(workouts):
                        st.write(f"• {workout.get('type', 'Workout')} - {workout.get('duration', 0)} min ({workout.get('intensity', 'N/A')})")
                
                st.write(f"• Base TDEE: {day_detail.get('base_tdee', 0)} calories")
                st.write(f"• Workout calories: {day_detail.get('workout_calories', 0)} calories")
                st.write(f"• **Total TDEE: {day_detail.get('total_calories', 0)} calories** (estimated daily burn)")
            
            with detail_col2:
                st.write("**Meal & Snack Schedule:**")
                meals = day_detail.get('meals', [])
                for meal in meals:
                    meal_type = meal.get('type', 'meal').title()
                    st.write(f"• {meal['name']} ({meal_type}) - {meal['context']} - ~{meal['calories']} cal")
    
    # Save schedule and proceed
    st.divider()
    if st.button("💾 Save Schedule & Continue to Nutrition Targets", type="primary", key="save_schedule"):
        # Convert to the format expected by other parts of the app
        st.session_state.confirmed_weekly_schedule = copy.deepcopy(st.session_state.weekly_schedule_v2)
        
        # Calculate day-specific TDEE values for nutrition targets
        day_tdee_values = {}
        for day in days_of_week:
            day_data = st.session_state.weekly_schedule_v2.get(day, {})
            day_tdee_values[day] = day_data.get('total_calories', 2000)
        st.session_state.day_tdee_values = day_tdee_values
        
        st.success("✅ Schedule saved! You can now proceed to Nutrition Targets to set your daily nutrition goals based on this schedule.")
        st.balloons()

else:
    st.info("👆 Please generate your weekly schedule using the form above to see your personalized schedule overview.")

# Add helpful tips
st.divider()
st.markdown("### 💡 Tips for Better Meal Planning")
st.markdown("""
- **Home Cooking**: Plan prep time and grocery shopping
- **Meal Prep**: Best for consistent schedules and batch cooking  
- **Restaurant/Dining Out**: Factor in social meals and budget
- **On-the-Go**: Focus on portable, convenient options
- **Post-Workout**: Emphasize protein and recovery nutrition
- **Office/Work**: Consider storage and heating options
""")