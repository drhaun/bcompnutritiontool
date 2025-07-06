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
    # Get meal frequency from diet preferences
    if 'diet_preferences' in st.session_state and 'meal_frequency' in st.session_state.diet_preferences:
        meals_per_day = st.session_state.diet_preferences['meal_frequency']
        st.info(f"Using {meals_per_day} meals per day from your Diet Preferences")
    else:
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

# Meal context options for better meal planning
st.subheader("Typical Meal & Snack Contexts")
st.write("Set default contexts for each meal and snack to help with meal planning and preparation")

# Create meal context inputs
meal_contexts = {}
meal_names = ["Breakfast", "Lunch", "Dinner", "Snack 1", "Snack 2", "Snack 3", "Snack 4", "Snack 5"]

context_options = [
    "Home Cooking", "Meal Prep", "Restaurant/Dining Out", 
    "Takeout/Delivery", "On-the-Go/Portable", "Office/Work",
    "Post-Workout", "Pre-Workout", "Social Eating",
    "Quick & Easy", "Healthy Snack", "Family Meal"
]

# Create context inputs for meals and snacks with better ordering
total_eating_occasions = meals_per_day + snacks_per_day
context_cols = st.columns(min(total_eating_occasions, 3))

# Time range options for meals and snacks
time_range_options = [
    "Early Morning (5:00-8:00 AM)",
    "Morning (8:00-11:00 AM)", 
    "Midday (11:00 AM-2:00 PM)",
    "Afternoon (2:00-5:00 PM)",
    "Evening (5:00-8:00 PM)",
    "Night (8:00-11:00 PM)"
]

# Handle meals with ordinal naming
for i in range(meals_per_day):
    ordinal = ["First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Eighth"][i]
    meal_name = f"{ordinal} Meal of Day"
    col_idx = i % len(context_cols)
    
    with context_cols[col_idx]:
        st.write(f"**{meal_name}**")
        meal_contexts[meal_name] = st.selectbox(
            "Context",
            context_options,
            key=f"meal_context_{i}",
            help="This helps determine meal suggestions and preparation methods"
        )
        # Add time range selection
        meal_time_range = st.selectbox(
            "Typical time range",
            time_range_options,
            index=min(i, len(time_range_options)-1),
            key=f"meal_time_range_{i}"
        )

# Handle snacks with ordinal naming  
for i in range(snacks_per_day):
    ordinal = ["First", "Second", "Third", "Fourth", "Fifth"][i]
    snack_name = f"{ordinal} Snack of Day"
    col_idx = (meals_per_day + i) % len(context_cols)
    
    with context_cols[col_idx]:
        st.write(f"**{snack_name}**")
        meal_contexts[snack_name] = st.selectbox(
            "Context",
            context_options,
            key=f"snack_context_{i}",
            help="This helps determine snack suggestions and preparation methods"
        )
        # Add time range selection
        snack_time_range = st.selectbox(
            "Typical time range",
            time_range_options,
            index=min(i+1, len(time_range_options)-1),
            key=f"snack_time_range_{i}"
        )

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
    generate_schedule_triggered = True
else:
    generate_schedule_triggered = False

if generate_schedule_triggered:
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
    
    # Smart optimization functions
    def time_to_minutes(time_str):
        """Convert time string (HH:MM) to minutes since midnight"""
        if isinstance(time_str, str):
            hours, minutes = map(int, time_str.split(':'))
        else:
            hours, minutes = time_str.hour, time_str.minute
        return hours * 60 + minutes
    
    def minutes_to_time(minutes):
        """Convert minutes since midnight to time string (HH:MM)"""
        hours = minutes // 60
        mins = minutes % 60
        return f"{hours:02d}:{mins:02d}"
    
    def optimize_workout_time(day, work_start_min, work_end_min, wake_min, bed_min, workout_duration_mins):
        """Find optimal workout time based on preferences and constraints"""
        # Get workout preference time ranges
        pref_ranges = {
            "Morning (6-10 AM)": (6*60, 10*60),
            "Lunch Break (11 AM-2 PM)": (11*60, 14*60),
            "Evening (5-8 PM)": (17*60, 20*60),
            "Flexible (any time)": (wake_min + 60, bed_min - 180)  # 1 hour after wake, 3 hours before bed
        }
        
        pref_start, pref_end = pref_ranges.get(workout_time_pref, pref_ranges["Flexible (any time)"])
        
        # Avoid late workouts if selected
        if avoid_late_workouts:
            pref_end = min(pref_end, bed_min - 180)  # 3 hours before bed
        
        # Avoid work hours if working
        if work_start_min and work_end_min:
            # Try to fit workout before work
            if pref_start < work_start_min and pref_end > work_start_min:
                if pref_start + workout_duration_mins <= work_start_min - 60:  # 1 hour buffer
                    return pref_start
            
            # Try to fit workout after work
            if pref_start < work_end_min and pref_end > work_end_min:
                return max(pref_start, work_end_min + 60)  # 1 hour after work
        
        # Default to preference start time
        return max(pref_start, wake_min + 60)
    
    def optimize_meal_times(day, workout_time_min, work_start_min, work_end_min, wake_min, bed_min, workout_duration_mins):
        """Optimize meal timing based on workout, work schedule, and preferences"""
        meal_times = []
        
        # Convert constraint times to minutes
        breakfast_latest_min = time_to_minutes(breakfast_latest)
        dinner_earliest_min = time_to_minutes(dinner_earliest)
        meal_spacing_min = int(meal_spacing * 60)
        
        # Start with breakfast
        breakfast_time = min(wake_min + 60, breakfast_latest_min)  # 1 hour after wake or latest breakfast time
        meal_times.append(breakfast_time)
        
        # Handle pre-workout meal if needed
        if workout_time_min and pre_workout_meal and not fasted_workouts:
            pre_workout_time = workout_time_min - 60  # 1 hour before workout
            if pre_workout_time > breakfast_time + meal_spacing_min:
                meal_times.append(pre_workout_time)
        
        # Handle post-workout meal if needed
        if workout_time_min and post_workout_meal:
            post_workout_time = workout_time_min + workout_duration_mins + 30  # 30 min after workout
            if post_workout_time < dinner_earliest_min:
                meal_times.append(post_workout_time)
        
        # Fill in remaining meals with optimal spacing
        while len(meal_times) < meals_per_day:
            if len(meal_times) == meals_per_day - 1:
                # Last meal (dinner)
                dinner_time = max(dinner_earliest_min, meal_times[-1] + meal_spacing_min)
                dinner_time = min(dinner_time, bed_min - 180)  # 3 hours before bed
                meal_times.append(dinner_time)
            else:
                # Intermediate meals
                next_meal_time = meal_times[-1] + meal_spacing_min
                # Avoid work hours if possible
                if work_start_min and work_end_min and work_start_min <= next_meal_time <= work_end_min:
                    if next_meal_time < work_start_min + 60:
                        next_meal_time = work_start_min - 30  # Before work
                    else:
                        next_meal_time = work_end_min + 30  # After work
                
                meal_times.append(next_meal_time)
        
        # Ensure proper spacing and sort
        meal_times.sort()
        
        # Adjust for energy focus
        if energy_focus == "Work Performance (larger lunch)":
            # Move lunch closer to middle of work day if working
            if work_start_min and work_end_min:
                work_mid = (work_start_min + work_end_min) // 2
                # Find closest meal to work midpoint and adjust
                for i, meal_time in enumerate(meal_times[1:-1], 1):  # Skip breakfast and dinner
                    if abs(meal_time - work_mid) < 120:  # Within 2 hours
                        meal_times[i] = work_mid
                        break
        
        return meal_times
    
    def get_meal_contexts_optimized(meal_times, workout_time_min, work_start_min, work_end_min, workout_duration_mins):
        """Assign optimized meal contexts based on timing and activities"""
        contexts = []
        
        for i, meal_time in enumerate(meal_times):
            context = meal_contexts.get(meal_names[i], "Home Cooking")
            
            # Override with smart context selection
            if workout_time_min:
                # Pre-workout meal
                if abs(meal_time - (workout_time_min - 60)) < 30:
                    context = "Pre-Workout"
                # Post-workout meal
                elif abs(meal_time - (workout_time_min + workout_duration_mins + 30)) < 60:
                    context = "Post-Workout"
            
            # Work hour meals
            if work_start_min and work_end_min and work_start_min <= meal_time <= work_end_min:
                context = "Office/Work"
            
            # Early morning meals
            if meal_time < time_to_minutes("08:00"):
                context = "Quick & Easy"
            
            # Late meals
            if meal_time > time_to_minutes("19:00"):
                if energy_focus == "Evening Social (lighter day, bigger dinner)":
                    context = "Social Eating"
                else:
                    context = "Family Meal"
            
            contexts.append(context)
        
        return contexts
    
    # Show optimization progress
    optimization_status = st.empty()
    if st.session_state.get('generate_optimized', False):
        optimization_status.info("🧠 Optimizing your weekly schedule using smart algorithms...")
    else:
        optimization_status.info("📋 Generating your basic weekly schedule...")
    
    # Safely get workout variables from session state or use defaults
    try:
        workout_days_list = workout_days if workout_days else []
    except NameError:
        workout_days_list = []
    
    try:
        workout_duration_val = workout_duration if workout_duration else 60
    except NameError:
        workout_duration_val = 60
        
    try:
        workout_intensity_val = workout_intensity if workout_intensity else "Moderate"
    except NameError:
        workout_intensity_val = "Moderate"
    
    # Generate schedule for each day
    for i, day in enumerate(days_of_week):
        # Determine if this is a workout day
        is_workout_day = day in workout_days_list if total_workouts > 0 else False
        
        # Calculate TDEE for the day
        base_tdee = bmr * activity_multipliers.get(activity_level, 1.375)
        
        # Add workout calories if it's a workout day
        workout_calories = 0
        if is_workout_day and total_workouts > 0:
            workout_calories = workout_duration_val * intensity_cals_per_min.get(workout_intensity_val, 7.5)
        
        day_tdee = int(base_tdee + workout_calories)
        
        # Convert time inputs to minutes for optimization
        wake_min = time_to_minutes(wake_time)
        bed_min = time_to_minutes(bed_time)
        work_start_min = time_to_minutes(work_start) if work_start else None
        work_end_min = time_to_minutes(work_end) if work_end else None
        
        # Optimize workout time if using smart optimizer
        workout_time_min = None
        if is_workout_day and st.session_state.get('generate_optimized', False):
            workout_time_min = optimize_workout_time(day, work_start_min, work_end_min, wake_min, bed_min, workout_duration_val)
        elif is_workout_day:
            # Use default workout time for basic schedule
            workout_time_min = 18 * 60  # 6 PM default
        
        # Optimize meal times
        if st.session_state.get('generate_optimized', False):
            optimized_meal_times = optimize_meal_times(day, workout_time_min, work_start_min, work_end_min, wake_min, bed_min, workout_duration_val)
            optimized_contexts = get_meal_contexts_optimized(optimized_meal_times, workout_time_min, work_start_min, work_end_min, workout_duration_val)
        else:
            # Use basic meal timing
            optimized_meal_times = []
            optimized_contexts = []
            
            # Simple meal timing for basic schedule
            if meals_per_day == 2:
                optimized_meal_times = [8*60, 18*60]  # 8 AM, 6 PM
            elif meals_per_day == 3:
                optimized_meal_times = [7*60+30, 12*60+30, 18*60+30]  # 7:30 AM, 12:30 PM, 6:30 PM
            elif meals_per_day == 4:
                optimized_meal_times = [7*60, 10*60, 13*60, 18*60]  # 7 AM, 10 AM, 1 PM, 6 PM
            else:
                # Evenly distribute meals
                start_time = wake_min + 60
                end_time = bed_min - 180
                time_span = end_time - start_time
                for j in range(meals_per_day):
                    meal_time = start_time + (j * time_span // (meals_per_day - 1))
                    optimized_meal_times.append(meal_time)
            
            # Use default contexts for basic schedule
            for j in range(meals_per_day):
                meal_name = meal_names[j] if j < len(meal_names) else f"Meal {j+1}"
                optimized_contexts.append(meal_contexts.get(meal_name, "Home Cooking"))
        
        # Create day schedule
        day_schedule = {
            "wake_time": wake_time.strftime("%H:%M"),
            "bed_time": bed_time.strftime("%H:%M"),
            "sleep_hours": round(sleep_hours, 1),
            "work_start": work_start.strftime("%H:%M") if work_start else None,
            "work_end": work_end.strftime("%H:%M") if work_end else None,
            "work_type": work_type,
            "has_workout": is_workout_day,
            "workout_duration": workout_duration_val if is_workout_day else 0,
            "workout_intensity": workout_intensity_val if is_workout_day else None,
            "workout_time": minutes_to_time(workout_time_min) if workout_time_min else None,
            "activity_level": activity_level,
            "estimated_tdee": day_tdee,
            "meals": [],
            "meal_contexts": meal_contexts.copy(),
            "optimized": st.session_state.get('generate_optimized', False)
        }
        
        # Add optimized meals to schedule
        for j in range(len(optimized_meal_times)):
            meal_name = meal_names[j] if j < len(meal_names) else f"Meal {j+1}"
            meal_time = minutes_to_time(optimized_meal_times[j])
            meal_context = optimized_contexts[j] if j < len(optimized_contexts) else "Home Cooking"
            
            day_schedule["meals"].append({
                "name": meal_name,
                "time": meal_time,
                "context": meal_context
            })
        
        st.session_state.weekly_schedule_v2[day] = day_schedule
    
    # Clear optimization status and show completion
    optimization_status.empty()
    if st.session_state.get('generate_optimized', False):
        st.success("🧠 Smart optimized schedule generated successfully! Meal times, workout timing, and contexts have been optimized based on your preferences.")
        
        # Show optimization insights
        with st.expander("🔍 Optimization Insights", expanded=False):
            st.write("**Smart optimizations applied:**")
            if pre_workout_meal:
                st.write("• Pre-workout meals scheduled 1 hour before workouts")
            if post_workout_meal:
                st.write("• Post-workout meals scheduled within 2 hours after workouts")
            if avoid_late_workouts:
                st.write("• Workouts scheduled at least 3 hours before bedtime")
            st.write(f"• Meals spaced at least {meal_spacing} hours apart")
            st.write(f"• Energy distribution optimized for: {energy_focus}")
            if workout_time_pref != "Flexible (any time)":
                st.write(f"• Workouts scheduled during preferred time: {workout_time_pref}")
    else:
        st.success("✅ Basic weekly schedule generated successfully!")

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