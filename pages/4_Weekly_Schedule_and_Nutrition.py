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
    
    # Initialize weekly schedule with empty days
    st.session_state.weekly_schedule = {day: copy.deepcopy(day_template) for day in days_of_week}

# Initialize nutrition tracking if needed
if 'day_specific_nutrition' not in st.session_state:
    st.session_state.day_specific_nutrition = {}

# Define days of the week for consistent use
days_of_week = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

# Setup page header with Fitomics branding
st.title("Weekly Schedule & Nutrition Planner")

# Tabs for schedule and nutrition
tab1, tab2 = st.tabs(["Weekly Schedule", "Nutrition Targets"])

# -----------------------------
# Tab 1: Weekly Schedule Planner
# -----------------------------
with tab1:
    st.header("Weekly Schedule Planner")
    st.write("Plan your weekly activities including meals, workouts, and sleep schedule.")
    
    # Add guidance information
    st.info("""
    **Why this matters:** 
    - Your activity levels and workout schedule affect your daily energy needs
    - Rest days typically require fewer calories than training days
    - Meal timing around workouts can optimize performance and recovery
    - Getting 7-9 hours of sleep is essential for recovery and results
    """)
    
    # Default schedule setup
    st.subheader("Quick Schedule Setup")
    st.write("Set up your default schedule parameters and we'll create a weekly schedule for you.")
    
    # Create two column layout for sleep schedule
    sleep_col1, sleep_col2 = st.columns(2)
    
    with sleep_col1:
        default_wake_time = st.session_state.get('default_wake_time', "06:00")
        default_wake_time = st.time_input("Default Wake Time", value=datetime.time.fromisoformat(default_wake_time))
        st.session_state['default_wake_time'] = default_wake_time.strftime("%H:%M")
    
    with sleep_col2:
        default_bed_time = st.session_state.get('default_bed_time', "22:00")
        default_bed_time = st.time_input("Default Bed Time", value=datetime.time.fromisoformat(default_bed_time))
        st.session_state['default_bed_time'] = default_bed_time.strftime("%H:%M")
    
    # Calculate sleep duration
    def calculate_sleep_duration(wake_time, bed_time):
        wake_datetime = datetime.datetime.combine(datetime.date.today(), wake_time)
        bed_datetime = datetime.datetime.combine(datetime.date.today(), bed_time)
        
        # If bed time is earlier than wake time, it means the person sleeps past midnight
        if bed_datetime < wake_datetime:
            bed_datetime += datetime.timedelta(days=1)
            
        sleep_duration = bed_datetime - wake_datetime
        return 24 - (sleep_duration.total_seconds() / 3600)  # Convert to hours
    
    sleep_hours = calculate_sleep_duration(default_wake_time, default_bed_time)
    
    if sleep_hours < 7:
        st.warning(f"You're planning {sleep_hours:.1f} hours of sleep, which is less than the recommended 7-9 hours for optimal recovery and health.")
    else:
        st.success(f"You're planning {sleep_hours:.1f} hours of sleep, which is within the recommended 7-9 hours for optimal recovery and health.")
    
    # Meal setup
    st.subheader("Default Meal Schedule")
    
    # Get default value from diet preferences if available
    default_meals = 4  # fallback default
    if 'diet_preferences' in st.session_state and 'meal_frequency' in st.session_state.diet_preferences:
        default_meals = st.session_state.diet_preferences['meal_frequency']
    
    meals_per_day = st.slider("Number of meals per day", min_value=2, max_value=8, value=default_meals, 
                             help="This includes main meals and snacks.")
    
    # Default meal times based on number of meals
    meal_time_suggestions = {
        2: ["08:00", "18:00"],
        3: ["07:00", "12:00", "18:00"],
        4: ["07:00", "10:00", "13:00", "18:00"],
        5: ["07:00", "10:00", "13:00", "16:00", "19:00"],
        6: ["07:00", "10:00", "12:00", "15:00", "17:00", "20:00"],
        7: ["07:00", "09:00", "11:00", "13:00", "15:00", "17:00", "20:00"],
        8: ["07:00", "09:00", "11:00", "13:00", "15:00", "17:00", "19:00", "21:00"]
    }
    
    # Workout setup
    st.subheader("Workout Schedule")
    
    # Resistance training
    st.write("#### Resistance Training")
    resistance_col1, resistance_col2 = st.columns(2)
    
    with resistance_col1:
        resistance_sessions = st.number_input("Resistance training sessions per week", 
                                             min_value=0, max_value=7, value=3)
    
    with resistance_col2:
        resistance_days = []
        if resistance_sessions > 0:
            resistance_days = st.multiselect(
                "Preferred days for resistance training",
                ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
                default=["Monday", "Wednesday", "Friday"][:resistance_sessions]
            )
            
            # Ensure the number of selected days matches the number of sessions
            if len(resistance_days) != resistance_sessions:
                st.warning(f"Please select exactly {resistance_sessions} days for resistance training.")
    
    # Only show resistance details if sessions > 0
    if resistance_sessions > 0:
        resistance_col3, resistance_col4, resistance_col5 = st.columns(3)
        
        with resistance_col3:
            resistance_time = st.time_input("Default resistance training time", 
                                          value=datetime.time(18, 0))  # 6:00 PM default
        
        with resistance_col4:
            resistance_duration = st.number_input("Default duration (minutes)", 
                                               min_value=15, max_value=180, value=60, step=15)
        
        with resistance_col5:
            resistance_intensity = st.selectbox("Default intensity", 
                                             options=["Light", "Moderate", "High", "Very High"],
                                             index=1)  # Moderate as default
    
    # Cardio training
    st.write("#### Cardio Training")
    cardio_col1, cardio_col2 = st.columns(2)
    
    with cardio_col1:
        cardio_sessions = st.number_input("Cardio sessions per week", 
                                        min_value=0, max_value=7, value=2)
    
    with cardio_col2:
        cardio_days = []
        if cardio_sessions > 0:
            cardio_days = st.multiselect(
                "Preferred days for cardio",
                ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
                default=["Tuesday", "Saturday"][:cardio_sessions]
            )
            
            # Ensure the number of selected days matches the number of sessions
            if len(cardio_days) != cardio_sessions:
                st.warning(f"Please select exactly {cardio_sessions} days for cardio training.")
    
    # Only show cardio details if sessions > 0
    if cardio_sessions > 0:
        cardio_col3, cardio_col4, cardio_col5 = st.columns(3)
        
        with cardio_col3:
            cardio_time = st.time_input("Default cardio time", 
                                      value=datetime.time(7, 0))  # 7:00 AM default
        
        with cardio_col4:
            cardio_duration = st.number_input("Default cardio duration (minutes)", 
                                           min_value=10, max_value=180, value=30, step=5)
        
        with cardio_col5:
            cardio_intensity = st.selectbox("Default cardio intensity", 
                                         options=["Light", "Moderate", "High", "Very High"],
                                         index=1)  # Moderate as default
    
    # Default activity level for each day
    st.subheader("Default Activity Level")
    default_activity = st.selectbox("Activity level outside of workouts", 
                                  options=["Sedentary", "Lightly Active", "Moderately Active", 
                                           "Very Active", "Extremely Active"],
                                  index=1)  # Lightly Active as default
    
    # Generate default schedule button
    if st.button("Generate Default Weekly Schedule", type="primary"):
        days_of_week = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        
        # Clear existing schedule if exists
        if 'weekly_schedule' in st.session_state:
            st.session_state.weekly_schedule = {}
        
        # Create default schedule for each day
        for day in days_of_week:
            # Initialize day's schedule
            day_schedule = {
                "wake_time": default_wake_time.strftime("%H:%M"),
                "bed_time": default_bed_time.strftime("%H:%M"),
                "meals": [],
                "workouts": [],
                "total_activity_level": default_activity
            }
            
            # Add meals based on the number selected
            for i in range(meals_per_day):
                # Get suggested time from our mapping or use evenly spread times
                meal_time = meal_time_suggestions.get(meals_per_day, [])[i] if i < len(meal_time_suggestions.get(meals_per_day, [])) else "12:00"
                
                if i == 0:
                    meal_name = "Breakfast"
                elif i == meals_per_day - 1:
                    meal_name = "Dinner"
                elif i == 1 and meals_per_day >= 3:
                    meal_name = "Lunch"
                else:
                    meal_name = f"Snack {i}"
                
                day_schedule["meals"].append({
                    "name": meal_name,
                    "time": meal_time
                })
            
            # Add resistance training if this day is selected
            if day in resistance_days:
                day_schedule["workouts"].append({
                    "name": "Resistance Training",
                    "start_time": resistance_time.strftime("%H:%M"),
                    "duration": resistance_duration,
                    "intensity": resistance_intensity
                })
            
            # Add cardio if this day is selected
            if day in cardio_days:
                day_schedule["workouts"].append({
                    "name": "Cardio",
                    "start_time": cardio_time.strftime("%H:%M"),
                    "duration": cardio_duration,
                    "intensity": cardio_intensity
                })
            
            # Calculate workout calories for this day
            workout_calories = 0
            intensity_multipliers = {
                "Light": 5.0,
                "Moderate": 7.5,
                "High": 10.0,
                "Very High": 12.5
            }
            
            for workout in day_schedule["workouts"]:
                calories = workout.get("duration", 60) * intensity_multipliers.get(workout.get("intensity", "Moderate"), 7.5)
                workout_calories += calories
            
            # Calculate TDEE based on user's base data
            user_info = st.session_state.get('user_info', {})
            weight_kg = user_info.get('weight_kg', 70)
            height_cm = user_info.get('height_cm', 175)
            age = user_info.get('age', 30)
            gender = user_info.get('gender', 'Male')
            
            # Calculate base TDEE using utility function
            base_tdee = utils.calculate_bmr(gender, weight_kg, height_cm, age)
            
            # Apply day's activity factor
            activity_multipliers = {
                "Sedentary": 1.2,
                "Lightly Active": 1.375,
                "Moderately Active": 1.55,
                "Very Active": 1.725,
                "Extremely Active": 1.9
            }
            day_activity_factor = activity_multipliers.get(day_schedule["total_activity_level"], 1.2)
            day_tdee = int(base_tdee * day_activity_factor) + workout_calories
            
            # Store the estimated TDEE for this day
            day_schedule["estimated_tdee"] = day_tdee
            
            # Store the day's schedule
            st.session_state.weekly_schedule[day] = day_schedule
        
        # AUTOMATIC CONFIRMATION: Store the schedule to populate the weekly overview table
        st.session_state.confirmed_weekly_schedule = copy.deepcopy(st.session_state.weekly_schedule)
        
        # Also store day-specific TDEE values for meal planning
        day_tdee_values = {}
        for day in days_of_week:
            day_data = st.session_state.weekly_schedule.get(day, {})
            day_tdee_values[day] = day_data.get('estimated_tdee', 2000)
        
        st.session_state.day_tdee_values = day_tdee_values
        
        # Auto-generate day-specific nutrition targets based on the confirmed schedule
        if 'day_specific_nutrition' not in st.session_state:
            st.session_state.day_specific_nutrition = {}
        
        # Get user's goal type and other data from session state
        user_info = st.session_state.get('user_info', {})
        goal_info = st.session_state.get('goal_info', {})
        
        user_goal_type = goal_info.get('goal_type', 'maintain')
        user_weight_kg = user_info.get('weight_kg', 70)  # Default if not available
        
        # Populate nutrition targets for each day based on goals and workout intensity
        for day in days_of_week:
            day_data = st.session_state.confirmed_weekly_schedule.get(day, {})
            day_tdee = day_data.get('estimated_tdee', 2000)
            workout_count = len(day_data.get("workouts", []))
            
            # Adjust calories based on goal and weekly deficit/surplus
            if user_goal_type == "lose_fat":
                # Get weekly rate from goal_info (as percentage of body weight)
                weekly_weight_pct = goal_info.get('weekly_weight_pct', 0.0075)  # Default 0.75% of body weight
                # Calculate daily deficit based on weekly rate and body weight
                weekly_deficit = (weekly_weight_pct * user_weight_kg * 7700)  # 7700 calories per kg of fat
                daily_deficit = weekly_deficit / 7
                day_target_calories = round(day_tdee - daily_deficit)
                
                # Display explanation of the calculation
                st.info(f"Using weekly rate of {weekly_weight_pct*100:.2f}% of body weight for fat loss. Daily deficit: {int(daily_deficit)} calories.")
            elif user_goal_type == "gain_muscle":
                # Get weekly rate from goal_info (as percentage of body weight)
                weekly_weight_pct = goal_info.get('weekly_weight_pct', 0.0025)  # Default 0.25% of body weight
                # Calculate daily surplus based on weekly rate and body weight
                weekly_surplus = (weekly_weight_pct * user_weight_kg * 7700)  # Approximate energy surplus needed
                daily_surplus = weekly_surplus / 7
                day_target_calories = round(day_tdee + daily_surplus)
                
                # Display explanation of the calculation
                st.info(f"Using weekly rate of {weekly_weight_pct*100:.2f}% of body weight for muscle gain. Daily surplus: {int(daily_surplus)} calories.")
            else:  # Maintenance
                day_target_calories = day_tdee
            
            # For protein, use g/kg of bodyweight targets based on goal and workout intensity
            if user_goal_type == "lose_fat":
                # Higher protein for fat loss to preserve muscle
                base_protein = round(float(user_weight_kg) * 2.0)  # 2.0g/kg for fat loss
            elif user_goal_type == "gain_muscle":
                # High protein for muscle gain
                base_protein = round(float(user_weight_kg) * 1.8)  # 1.8g/kg for muscle gain
            else:
                # Moderate protein for maintenance
                base_protein = round(float(user_weight_kg) * 1.6)  # 1.6g/kg for maintenance
                
            # Adjust for workout days - more protein on training days
            if workout_count > 0:
                # Check for high-intensity workouts
                has_high_intensity = False
                for workout in day_data.get("workouts", []):
                    if workout.get("intensity") in ["High", "Very High"]:
                        has_high_intensity = True
                        break
                
                if has_high_intensity:
                    day_protein = round(base_protein * 1.1)  # 10% more protein on high-intensity workout days
                else:
                    day_protein = round(base_protein * 1.05)  # 5% more protein on regular workout days
            else:
                day_protein = base_protein  # Base protein on rest days
            
            # For fat, use minimum of 0.8g/kg or 30% of calories
            min_fat_from_weight = round(float(user_weight_kg) * 0.8)
            min_fat_from_calories = round((day_target_calories * 0.3) / 9)
            day_fat = max(min_fat_from_weight, min_fat_from_calories)
            
            # Calculate protein and fat calories
            protein_calories = day_protein * 4
            fat_calories = day_fat * 9
            
            # Calculate remaining calories for carbs
            remaining_calories = day_target_calories - protein_calories - fat_calories
            day_carbs = max(0, round(remaining_calories / 4))
            
            # Store day-specific nutrition targets
            st.session_state.day_specific_nutrition[day] = {
                "target_calories": day_target_calories,
                "protein": day_protein,
                "fat": day_fat,
                "carbs": day_carbs
            }
        
        st.success("Generated weekly schedule and nutrition targets!")
    
    # Weekly schedule overview expander
    with st.expander("Weekly Schedule Overview", expanded=True):
        # Check if we have a confirmed schedule
        if 'confirmed_weekly_schedule' not in st.session_state:
            st.warning("Please generate your weekly schedule using the options above.")
        else:
            # Get days of week
            days_of_week = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
            
            # Create a visual representation of the weekly schedule
            week_data = []
            
            for day in days_of_week:
                day_data = st.session_state.confirmed_weekly_schedule.get(day, {})
                
                # Get wake and bed times
                wake_time = day_data.get('wake_time', '06:00')
                bed_time = day_data.get('bed_time', '22:00')
                
                # Get sleep duration
                try:
                    wake_datetime = datetime.datetime.strptime(wake_time, "%H:%M").time()
                    bed_datetime = datetime.datetime.strptime(bed_time, "%H:%M").time()
                    sleep_hours = calculate_sleep_duration(wake_datetime, bed_datetime)
                    sleep_display = f"{sleep_hours:.1f} hours"
                except:
                    sleep_display = "N/A"
                
                # Count meals
                meal_count = len(day_data.get('meals', []))
                
                # Get workout summary
                workouts = day_data.get('workouts', [])
                workout_summary = ", ".join([w.get('name', 'Workout') + f" ({w.get('intensity', 'Moderate')})" for w in workouts]) if workouts else "None"
                
                # Add to data table
                week_data.append({
                    "Day": day,
                    "Wake-Bed": f"{wake_time} - {bed_time}",
                    "Sleep": sleep_display,
                    "Meals": meal_count,
                    "Workouts": workout_summary,
                    "Est. TDEE": f"{day_data.get('estimated_tdee', 'N/A')} cal"
                })
            
            # Display as a table
            df = pd.DataFrame(week_data)
            st.table(df)
            
            # Add "Use this Schedule" button
            if st.button("✅ Use this Schedule", type="primary"):
                # Store the schedule in session state for use in meal planning
                if 'confirmed_weekly_schedule' not in st.session_state:
                    st.session_state.confirmed_weekly_schedule = st.session_state.weekly_schedule
                else:
                    st.session_state.confirmed_weekly_schedule = copy.deepcopy(st.session_state.weekly_schedule)
                
                # Also store day-specific TDEE values for meal planning
                day_tdee_values = {}
                for day in days_of_week:
                    day_data = st.session_state.weekly_schedule.get(day, {})
                    day_tdee_values[day] = day_data.get('estimated_tdee', 2000)
                
                st.session_state.day_tdee_values = day_tdee_values
                
                # Auto-generate day-specific nutrition targets based on the confirmed schedule
                if 'day_specific_nutrition' not in st.session_state:
                    st.session_state.day_specific_nutrition = {}
                
                # Get user's goal type and other data from session state
                user_info = st.session_state.get('user_info', {})
                goal_info = st.session_state.get('goal_info', {})
                
                user_goal_type = goal_info.get('goal_type', 'maintain')
                user_weight_kg = user_info.get('weight_kg', 70)  # Default if not available
                
                # Populate nutrition targets for each day based on goals and workout intensity
                for day in days_of_week:
                    day_data = st.session_state.confirmed_weekly_schedule.get(day, {})
                    day_tdee = day_data.get('estimated_tdee', 2000)
                    workout_count = len(day_data.get("workouts", []))
                    
                    # Adjust calories based on goal and weekly deficit/surplus
                    if user_goal_type == "lose_fat":
                        # Get weekly rate from goal_info (as percentage of body weight)
                        weekly_weight_pct = goal_info.get('weekly_weight_pct', 0.0075)  # Default 0.75% of body weight
                        # Calculate daily deficit based on weekly rate and body weight
                        weekly_deficit = (weekly_weight_pct * user_weight_kg * 7700)  # 7700 calories per kg of fat
                        daily_deficit = weekly_deficit / 7
                        day_target_calories = round(day_tdee - daily_deficit)
                    elif user_goal_type == "gain_muscle":
                        # Get weekly rate from goal_info (as percentage of body weight)
                        weekly_weight_pct = goal_info.get('weekly_weight_pct', 0.0025)  # Default 0.25% of body weight
                        # Calculate daily surplus based on weekly rate and body weight
                        weekly_surplus = (weekly_weight_pct * user_weight_kg * 7700)  # Approximate energy surplus needed
                        daily_surplus = weekly_surplus / 7
                        day_target_calories = round(day_tdee + daily_surplus)
                    else:  # Maintenance
                        day_target_calories = day_tdee
                    
                    # For protein, use g/kg of bodyweight targets based on goal and workout intensity
                    if user_goal_type == "lose_fat":
                        # Higher protein for fat loss to preserve muscle
                        base_protein = round(float(user_weight_kg) * 2.0)  # 2.0g/kg for fat loss
                    elif user_goal_type == "gain_muscle":
                        # High protein for muscle gain
                        base_protein = round(float(user_weight_kg) * 1.8)  # 1.8g/kg for muscle gain
                    else:
                        # Moderate protein for maintenance
                        base_protein = round(float(user_weight_kg) * 1.6)  # 1.6g/kg for maintenance
                        
                    # Adjust for workout days - more protein on training days
                    if workout_count > 0:
                        # Check for high-intensity workouts
                        has_high_intensity = False
                        for workout in day_data.get("workouts", []):
                            if workout.get("intensity") in ["High", "Very High"]:
                                has_high_intensity = True
                                break
                        
                        if has_high_intensity:
                            day_protein = round(base_protein * 1.1)  # 10% more protein on high-intensity workout days
                        else:
                            day_protein = round(base_protein * 1.05)  # 5% more protein on regular workout days
                    else:
                        day_protein = base_protein  # Base protein on rest days
                    
                    # For fat, use minimum of 0.8g/kg or 30% of calories
                    min_fat_from_weight = round(float(user_weight_kg) * 0.8)
                    min_fat_from_calories = round((day_target_calories * 0.3) / 9)
                    day_fat = max(min_fat_from_weight, min_fat_from_calories)
                    
                    # Calculate protein and fat calories
                    protein_calories = day_protein * 4
                    fat_calories = day_fat * 9
                    
                    # Calculate remaining calories for carbs
                    remaining_calories = day_target_calories - protein_calories - fat_calories
                    day_carbs = max(0, round(remaining_calories / 4))
                    
                    # Store day-specific nutrition targets
                    st.session_state.day_specific_nutrition[day] = {
                        "target_calories": day_target_calories,
                        "protein": day_protein,
                        "fat": day_fat,
                        "carbs": day_carbs
                    }
                
                st.success("Weekly schedule confirmed! Now you can set up your nutrition targets.")

# -----------------------------
# Tab 2: Nutrition Targets
# -----------------------------
with tab2:
    st.header("Nutrition Targets")
    st.write("Set up your daily nutrition targets based on your schedule and goals.")
    
    # Add guidance information
    st.info("""
    **Why this matters:** 
    - Your calorie and macronutrient needs vary based on your activity level each day
    - Training days typically require more calories and carbohydrates than rest days
    - Higher protein intake on training days supports muscle recovery and growth
    - Matching your nutrition to your activity pattern optimizes body composition changes
    """)
    
    # Check if we have a confirmed schedule
    if 'confirmed_weekly_schedule' not in st.session_state or not st.session_state.confirmed_weekly_schedule:
        st.warning("Please set up and confirm your weekly schedule first.")
    else:
        # Get days of week
        days_of_week = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        
        # Display weekly schedule overview at the top
        st.subheader("Weekly Schedule Overview")
        
        # Create a visual representation of the weekly schedule
        schedule_data = []
        
        for day in days_of_week:
            day_data = st.session_state.confirmed_weekly_schedule.get(day, {})
            
            # Get wake and bed times
            wake_time = day_data.get('wake_time', '06:00')
            bed_time = day_data.get('bed_time', '22:00')
            
            # Get sleep duration
            try:
                wake_datetime = datetime.datetime.strptime(wake_time, "%H:%M").time()
                bed_datetime = datetime.datetime.strptime(bed_time, "%H:%M").time()
                sleep_hours = calculate_sleep_duration(wake_datetime, bed_datetime)
                sleep_display = f"{sleep_hours:.1f} hours"
            except:
                sleep_display = "N/A"
            
            # Get workout summary
            workouts = day_data.get('workouts', [])
            workout_summary = ", ".join([w.get('name', 'Workout') + f" ({w.get('intensity', 'Moderate')})" for w in workouts]) if workouts else "None"
            
            # Show estimated TDEE instead of nutrition
            estimated_tdee = day_data.get('estimated_tdee', 'N/A')
            
            # Add to data table
            schedule_data.append({
                "Day": day,
                "Wake-Bed": f"{wake_time} - {bed_time}",
                "Sleep": sleep_display,
                "Workouts": workout_summary,
                "Est. TDEE": f"{estimated_tdee} cal"
            })
        
        # Display as a table
        st.table(schedule_data)

        
        # Day-specific nutrition targets
        st.subheader("Day-Specific Nutrition Targets")
        
        # Copy options at the top
        st.markdown("##### Copy Settings")
        copy_col1, copy_col2, copy_col3 = st.columns([2, 2, 1])
        
        with copy_col1:
            copy_from_day = st.selectbox("Copy from:", days_of_week, key="copy_from_day")
        
        with copy_col2:
            copy_to_days = st.multiselect("Copy to:", 
                                        [day for day in days_of_week if day != copy_from_day], 
                                        key="copy_to_days")
        
        with copy_col3:
            if st.button("Copy Settings", type="secondary", use_container_width=True):
                if copy_to_days:
                    # Get the source day's nutrition data
                    source_data = st.session_state.day_specific_nutrition.get(copy_from_day, {})
                    if source_data:
                        # Copy to selected days
                        for day in copy_to_days:
                            st.session_state.day_specific_nutrition[day] = source_data.copy()
                        st.success(f"Copied nutrition settings from {copy_from_day} to {', '.join(copy_to_days)}")
                        st.rerun()
                    else:
                        st.warning(f"No nutrition settings found for {copy_from_day}")
                else:
                    st.warning("Please select at least one day to copy to")
        
        st.markdown("---")
        
        # Day selector
        selected_day = st.selectbox("Select day to edit:", days_of_week, key="nutrition_day_selector")
        
        # Get user information
        user_info = st.session_state.get('user_info', {})
        goal_info = st.session_state.get('goal_info', {})
        
        # Get user's bodyweight
        weight_kg = user_info.get('weight_kg', 70)
        weight_lb = weight_kg * 2.20462
        
        # Get user's fat-free mass if available
        body_fat_pct = user_info.get('body_fat_pct', 20)
        ffm_kg = weight_kg * (1 - (body_fat_pct / 100))
        
        # Get goal type from session state directly
        if "goal_type" in st.session_state:
            raw_goal_type = st.session_state.goal_type
            # Convert to the format used in this page
            if raw_goal_type == "Lose fat":
                user_goal_type = "lose_fat"
            elif raw_goal_type == "Gain muscle":
                user_goal_type = "gain_muscle"
            else:
                user_goal_type = "maintain"
        else:
            # Fallback if not in session state
            user_goal_type = goal_info.get('goal_type', 'maintain')
        
        # Get day's TDEE
        day_data = st.session_state.confirmed_weekly_schedule.get(selected_day, {})
        day_tdee = day_data.get('estimated_tdee', 2000)
        
        # Get day's workout info
        workouts = day_data.get('workouts', [])
        workout_summary = ", ".join([w.get('name', 'Workout') + f" ({w.get('intensity', 'Moderate')})" for w in workouts]) if workouts else "None"
        
        # Display day summary
        st.markdown(f"**{selected_day}**: TDEE {day_tdee} calories, Workouts: {workout_summary}")
        
        # Get existing nutrition data for this day
        day_macros = st.session_state.day_specific_nutrition.get(selected_day, {})
        if not day_macros:
            # Initialize with defaults
            day_macros = {
                "target_calories": 0,
                "protein": 0,
                "fat": 0, 
                "carbs": 0
            }
        
        # Create condensed nutrition layout
        with st.container(border=True):
            # Compact header with key info
            col1, col2 = st.columns([3, 1])
            with col1:
                st.markdown(f"#### Nutrition Targets for {selected_day}")
            with col2:
                with st.expander("ℹ️ Details"):
                    st.write(f"**TDEE:** {day_tdee} calories")
                    st.write(f"**Workouts:** {workout_summary}")
                    st.write(f"**Goal:** {user_goal_type.replace('_', ' ').title()}")
            
            # Condensed calorie target section
            
            # Calculate target calories based on goal and day's activity
            try:
                # Ensure all values are proper integers to avoid type mismatches
                min_cal = int(float(day_tdee) * 0.7)
                max_cal = int(float(day_tdee) * 1.3)
                
                # Ensure default_cal reflects body composition goals (fat loss, muscle gain)
                # This properly uses the selected weekly rate for energy targets
                if user_goal_type == "lose_fat":
                    # Get weekly rate directly from session state if available, otherwise use default
                    if "selected_weekly_weight_pct" in st.session_state:
                        weekly_weight_pct = abs(st.session_state.selected_weekly_weight_pct)  # Make sure it's positive
                    else:
                        weekly_weight_pct = goal_info.get('weekly_weight_pct', 0.0075)  # Default 0.75% of body weight
                    # Calculate daily deficit based on weekly rate and body weight
                    weekly_deficit = (weekly_weight_pct * weight_kg * 7700)  # 7700 calories per kg of fat
                    daily_deficit = weekly_deficit / 7
                    default_cal = int(day_tdee - daily_deficit)
                    
                    # Add clear explanation in the UI
                    st.info(f"**Using your selected weekly rate of {weekly_weight_pct*100:.2f}% of body weight** for fat loss calculation. This creates a daily deficit of **{int(daily_deficit)} calories**, adjusting your target from the maintenance level of {day_tdee} calories to **{default_cal} calories**.")
                elif user_goal_type == "gain_muscle":
                    # Get weekly rate from goal_info (as percentage of body weight)
                    weekly_weight_pct = goal_info.get('weekly_weight_pct', 0.0025)  # Default 0.25% of body weight
                    # Calculate daily surplus based on weekly rate and body weight
                    weekly_surplus = (weekly_weight_pct * weight_kg * 7700)  # Approximate energy surplus needed
                    daily_surplus = weekly_surplus / 7
                    default_cal = int(day_tdee + daily_surplus)
                    
                    # Add clear explanation in the UI
                    st.info(f"**Using your selected weekly rate of {weekly_weight_pct*100:.2f}% of body weight** for muscle gain calculation. This creates a daily surplus of **{int(daily_surplus)} calories**, adjusting your target from the maintenance level of {day_tdee} calories to **{default_cal} calories**.")
                else:  # Maintenance
                    default_cal = int(day_tdee)
                    st.info(f"Maintenance goal selected - target calories match your estimated TDEE of {day_tdee} calories.")
                    
                # Only use the existing value if it's been set by the user
                if 'target_calories' in day_macros and isinstance(day_macros['target_calories'], (int, float)) and day_macros['target_calories'] > 0:
                    # But only if we're not changing the page (i.e., when user is viewing existing values)
                    if st.session_state.get('nutrition_calc_updated', False) == False:
                        default_cal = int(day_macros['target_calories'])
                
                # Track that we've updated the calculation for this session
                st.session_state['nutrition_calc_updated'] = True
            except Exception as e:
                st.error(f"Error calculating calorie targets: {str(e)}")
                default_cal = 2000
                min_cal = 1200
                max_cal = 4000
            
            # Condensed calorie and macro input
            macro_cols = st.columns(4)
            
            with macro_cols[0]:
                # Direct calorie input - ensure value is within bounds
                safe_value = max(min_cal, min(max_cal, default_cal))
                custom_day_calories = st.number_input(
                    f"Calories (Goal: {default_cal})",
                    min_value=min_cal,
                    max_value=max_cal,
                    value=safe_value,
                    step=10,
                    key=f"cal_input_{selected_day}"
                )
                
                # Energy availability calculation and display
                try:
                    # Get workout data for energy expenditure estimation
                    workout_calories = 0
                    if selected_day in st.session_state.weekly_schedule:
                        day_workouts = st.session_state.weekly_schedule[selected_day].get('workouts', [])
                        for workout in day_workouts:
                            if 'duration' in workout and 'intensity' in workout:
                                duration_min = workout.get('duration', 0)
                                intensity = workout.get('intensity', 'Moderate')
                                if intensity == 'Light':
                                    cal_per_min = 6
                                elif intensity == 'Vigorous':
                                    cal_per_min = 12
                                else:  # Moderate
                                    cal_per_min = 9
                                workout_calories += duration_min * cal_per_min
                    
                    # Calculate energy availability - check multiple possible sources for body fat data
                    body_fat_pct = None
                    
                    # Check various possible locations for body fat percentage
                    if 'body_fat_percentage' in st.session_state and st.session_state.body_fat_percentage:
                        body_fat_pct = st.session_state.body_fat_percentage
                    elif 'user_info' in st.session_state and st.session_state.user_info.get('body_fat_percentage'):
                        body_fat_pct = st.session_state.user_info.get('body_fat_percentage')
                    elif 'current_bf_pct' in st.session_state and st.session_state.current_bf_pct:
                        body_fat_pct = st.session_state.current_bf_pct
                    elif hasattr(st.session_state, 'body_fat_pct') and st.session_state.body_fat_pct:
                        body_fat_pct = st.session_state.body_fat_pct
                    
                    if body_fat_pct and body_fat_pct > 0:
                        bf_pct = body_fat_pct / 100 if body_fat_pct > 1 else body_fat_pct
                        ffm_kg = weight_kg * (1 - bf_pct)
                        energy_availability = (custom_day_calories - workout_calories) / ffm_kg if ffm_kg > 0 else 0
                        
                        # Energy availability color coding
                        if energy_availability < 30:
                            ea_color = "🔴"  # Low EA
                        elif energy_availability < 35:
                            ea_color = "🟡"  # Moderate EA
                        else:
                            ea_color = "🟢"  # Adequate EA
                        
                        st.markdown(f"{ea_color} EA: {energy_availability:.0f} kcal/kg FFM")
                    else:
                        st.markdown("🔵 Set body fat % for EA calc")
                        
                except Exception:
                    pass  # Skip energy availability if calculation fails
            
            # Calculate default macro values
            if user_goal_type == "lose_fat":
                default_protein = round(weight_kg * 2.0)  # Higher for fat loss
                default_fat = round(weight_kg * 0.8)  # 0.8g/kg
            elif user_goal_type == "gain_muscle":
                default_protein = round(weight_kg * 1.8)  # High for muscle gain
                default_fat = round(weight_kg * 1.0)  # 1.0g/kg
            else:
                default_protein = round(weight_kg * 1.6)  # Moderate for maintenance
                default_fat = round(weight_kg * 0.9)  # 0.9g/kg
            
            # Get existing values or use defaults
            current_protein = day_macros.get('protein', default_protein) if day_macros.get('protein', 0) > 0 else default_protein
            current_fat = day_macros.get('fat', default_fat) if day_macros.get('fat', 0) > 0 else default_fat
            
            # Calculate remaining calories for carbs
            protein_calories = current_protein * 4
            fat_calories = current_fat * 9
            remaining_calories = custom_day_calories - protein_calories - fat_calories
            default_carbs = max(0, round(remaining_calories / 4))
            current_carbs = day_macros.get('carbs', default_carbs) if day_macros.get('carbs', 0) > 0 else default_carbs
            
            with macro_cols[1]:
                custom_day_protein = st.number_input(
                    f"Protein (g) [Goal: {default_protein}g]",
                    min_value=50,
                    max_value=int(custom_day_calories / 4),
                    value=current_protein,
                    step=5,
                    key=f"protein_input_{selected_day}"
                )
                
                # Calculate and display protein ratios with color coding
                protein_per_kg = round(custom_day_protein / weight_kg, 2)
                protein_per_lb = round(custom_day_protein / weight_lb, 2)
                if custom_day_calories > 0:
                    protein_pct = round((custom_day_protein * 4 / custom_day_calories) * 100)
                else:
                    protein_pct = 0
                
                # Color coding for protein adequacy
                if protein_per_kg < 1.2:
                    protein_color = "🔴"  # Low
                elif protein_per_kg < 1.6:
                    protein_color = "🟡"  # Moderate
                else:
                    protein_color = "🟢"  # Adequate
                
                st.markdown(f"{protein_color} {protein_per_kg}g/kg ({protein_per_lb}g/lb) | {protein_pct}%")
            
            with macro_cols[2]:
                custom_day_carbs = st.number_input(
                    f"Carbs (g) [Auto: {default_carbs}g]",
                    min_value=0,
                    max_value=int(custom_day_calories / 4),
                    value=current_carbs,
                    step=5,
                    key=f"carbs_input_{selected_day}"
                )
                
                # Calculate and display carb ratios with color coding
                carb_per_kg = round(custom_day_carbs / weight_kg, 2)
                carb_per_lb = round(custom_day_carbs / weight_lb, 2)
                if custom_day_calories > 0:
                    carbs_pct = round((custom_day_carbs * 4 / custom_day_calories) * 100)
                else:
                    carbs_pct = 0
                
                # Color coding for carb adequacy (context-dependent)
                if carb_per_kg < 2.0:
                    carb_color = "🟡"  # Low-moderate (fine for some goals)
                elif carb_per_kg < 5.0:
                    carb_color = "🟢"  # Moderate-adequate
                else:
                    carb_color = "🟡"  # High (may be appropriate for athletes)
                
                st.markdown(f"{carb_color} {carb_per_kg}g/kg ({carb_per_lb}g/lb) | {carbs_pct}%")
            
            with macro_cols[3]:
                custom_day_fat = st.number_input(
                    f"Fat (g) [Goal: {default_fat}g]",
                    min_value=20,
                    max_value=int(custom_day_calories / 9),
                    value=current_fat,
                    step=1,
                    key=f"fat_input_{selected_day}"
                )
                
                # Calculate and display fat ratios with color coding
                fat_per_kg = round(custom_day_fat / weight_kg, 2)
                fat_per_lb = round(custom_day_fat / weight_lb, 2)
                if custom_day_calories > 0:
                    fat_pct = round((custom_day_fat * 9 / custom_day_calories) * 100)
                else:
                    fat_pct = 0
                
                # Color coding for fat adequacy
                if fat_per_kg < 0.6 or fat_pct < 15:
                    fat_color = "🔴"  # Too low
                elif fat_per_kg < 0.8 or fat_pct < 20:
                    fat_color = "🟡"  # Low-moderate
                else:
                    fat_color = "🟢"  # Adequate
                
                st.markdown(f"{fat_color} {fat_per_kg}g/kg ({fat_per_lb}g/lb) | {fat_pct}%")
            
            # Simplified macro summary
            total_macro_calories = (custom_day_protein * 4) + (custom_day_carbs * 4) + (custom_day_fat * 9)
            calorie_difference = total_macro_calories - custom_day_calories
            
            st.markdown(f"**Total:** {total_macro_calories} calories (P: {custom_day_protein}g, C: {custom_day_carbs}g, F: {custom_day_fat}g)")
            
            # Calorie difference warning
            if abs(calorie_difference) > 50:
                if calorie_difference > 0:
                    st.warning(f"Macros exceed target by {calorie_difference} calories")
                else:
                    st.info(f"Macros are {abs(calorie_difference)} calories under target")
            
            # Advanced settings in an expander to keep UI clean
            with st.expander("⚙️ Advanced Macro Settings & Alternative Input Methods"):
                st.markdown("### Quick Set by Ratios")
                
                # Option to set macros by different methods
                macro_method = st.radio(
                    "Set macros using:",
                    ["Manual (above)", "g/kg ratios", "g/lb ratios", "% of calories"],
                    horizontal=True,
                    key=f"macro_method_{selected_day}"
                )
                
                if macro_method != "Manual (above)":
                    st.markdown("---")
                    
                    if macro_method == "g/kg ratios":
                        col1, col2, col3 = st.columns(3)
                        with col1:
                            protein_gkg = st.number_input("Protein (g/kg)", min_value=0.8, max_value=4.0, 
                                                        value=2.0 if user_goal_type == "lose_fat" else 1.8, 
                                                        step=0.1, key=f"prot_gkg_{selected_day}")
                        with col2:
                            fat_gkg = st.number_input("Fat (g/kg)", min_value=0.5, max_value=2.0, 
                                                    value=0.8, step=0.1, key=f"fat_gkg_{selected_day}")
                        with col3:
                            carb_gkg = st.number_input("Carbs (g/kg)", min_value=0.0, max_value=8.0, 
                                                     value=3.0, step=0.1, key=f"carb_gkg_{selected_day}")
                        
                        # Calculate macros from ratios
                        calc_protein = round(protein_gkg * weight_kg)
                        calc_fat = round(fat_gkg * weight_kg)
                        calc_carbs = round(carb_gkg * weight_kg)
                        calc_calories = (calc_protein * 4) + (calc_fat * 9) + (calc_carbs * 4)
                        
                    elif macro_method == "g/lb ratios":
                        col1, col2, col3 = st.columns(3)
                        with col1:
                            protein_glb = st.number_input("Protein (g/lb)", min_value=0.4, max_value=1.8, 
                                                        value=0.9 if user_goal_type == "lose_fat" else 0.8, 
                                                        step=0.1, key=f"prot_glb_{selected_day}")
                        with col2:
                            fat_glb = st.number_input("Fat (g/lb)", min_value=0.2, max_value=1.0, 
                                                    value=0.4, step=0.1, key=f"fat_glb_{selected_day}")
                        with col3:
                            carb_glb = st.number_input("Carbs (g/lb)", min_value=0.0, max_value=3.5, 
                                                     value=1.4, step=0.1, key=f"carb_glb_{selected_day}")
                        
                        # Calculate macros from ratios
                        calc_protein = round(protein_glb * weight_lb)
                        calc_fat = round(fat_glb * weight_lb)
                        calc_carbs = round(carb_glb * weight_lb)
                        calc_calories = (calc_protein * 4) + (calc_fat * 9) + (calc_carbs * 4)
                        
                    elif macro_method == "% of calories":
                        # Set target calories first
                        target_cal = st.number_input("Target Calories", min_value=1200, max_value=4000, 
                                                   value=custom_day_calories, step=25, 
                                                   key=f"target_cal_{selected_day}")
                        
                        col1, col2, col3 = st.columns(3)
                        with col1:
                            protein_pct = st.number_input("Protein (%)", min_value=10, max_value=50, 
                                                        value=25, step=1, key=f"prot_pct_{selected_day}")
                        with col2:
                            fat_pct = st.number_input("Fat (%)", min_value=15, max_value=50, 
                                                    value=25, step=1, key=f"fat_pct_{selected_day}")
                        with col3:
                            carb_pct = st.number_input("Carbs (%)", min_value=10, max_value=70, 
                                                     value=50, step=1, key=f"carb_pct_{selected_day}")
                        
                        # Check if percentages add up to 100
                        total_pct = protein_pct + fat_pct + carb_pct
                        if total_pct != 100:
                            st.warning(f"Percentages total {total_pct}% - adjust to equal 100%")
                        
                        # Calculate macros from percentages
                        calc_protein = round((target_cal * protein_pct / 100) / 4)
                        calc_fat = round((target_cal * fat_pct / 100) / 9)
                        calc_carbs = round((target_cal * carb_pct / 100) / 4)
                        calc_calories = target_cal
                    
                    # Show calculated values and apply button
                    st.markdown("**Calculated Values:**")
                    st.write(f"Calories: {calc_calories} | Protein: {calc_protein}g | Carbs: {calc_carbs}g | Fat: {calc_fat}g")
                    
                    if st.button("Apply These Values", key=f"apply_calc_{selected_day}"):
                        # Update the session state to trigger recalculation
                        st.session_state[f"cal_input_{selected_day}"] = calc_calories
                        st.session_state[f"protein_input_{selected_day}"] = calc_protein
                        st.session_state[f"carbs_input_{selected_day}"] = calc_carbs
                        st.session_state[f"fat_input_{selected_day}"] = calc_fat
                        st.success("Values applied! Refresh to see changes in the inputs above.")
                        st.rerun()
                
                st.markdown("---")
                st.markdown("### Reference Guidelines")
                st.markdown("**Protein Coefficients by Goal:**")
                st.write("• Fat Loss: 2.0g/kg (0.9g/lb) - muscle preservation")
                st.write("• Muscle Gain: 1.8g/kg (0.8g/lb) - muscle synthesis")
                st.write("• Maintenance: 1.6g/kg (0.7g/lb) - general health")
                
                st.markdown("**Fat Guidelines:**")
                st.write("• Minimum: 0.8g/kg (0.4g/lb) - hormone production")
                st.write("• Optimal: 1.0g/kg (0.45g/lb) - satiety and absorption")
                
                st.markdown("**Carbohydrate Strategy:**")
                st.write("• Low: 1-2g/kg (0.5-1g/lb) - ketogenic/low-carb")
                st.write("• Moderate: 3-5g/kg (1.4-2.3g/lb) - general health")
                st.write("• High: 6-8g/kg (2.7-3.6g/lb) - endurance/high activity")
                
                st.markdown("**Energy Availability Guidelines:**")
                st.write("• >45 kcal/kg FFM: Optimal for performance and health")
                st.write("• 35-45 kcal/kg FFM: Adequate for most people")
                st.write("• <30 kcal/kg FFM: Risk of metabolic issues")
            
            # Save the nutrition targets
            st.session_state.day_specific_nutrition[selected_day] = {
                "target_calories": custom_day_calories,
                "protein": custom_day_protein,
                "carbs": custom_day_carbs,
                "fat": custom_day_fat
            }
    
    # Weekly summary table
    if st.session_state.day_specific_nutrition:
        st.subheader("Weekly Nutrition Summary")
        
        # Create a table showing all days
        weekly_data = []
        total_calories = 0
        total_protein = 0
        total_carbs = 0
        total_fat = 0
        
        for day in days_of_week:
            day_data = st.session_state.day_specific_nutrition.get(day, {})
            if day_data:
                calories = day_data.get('target_calories', 0)
                protein = day_data.get('protein', 0)
                carbs = day_data.get('carbs', 0)
                fat = day_data.get('fat', 0)
                
                # Calculate percentages
                if calories > 0:
                    protein_pct = round((protein * 4 / calories) * 100)
                    carbs_pct = round((carbs * 4 / calories) * 100)
                    fat_pct = round((fat * 9 / calories) * 100)
                else:
                    protein_pct = carbs_pct = fat_pct = 0
                
                weekly_data.append({
                    "Day": day,
                    "Calories": calories,
                    "Protein": f"{protein}g ({protein_pct}%)",
                    "Carbs": f"{carbs}g ({carbs_pct}%)",
                    "Fat": f"{fat}g ({fat_pct}%)"
                })
                
                # Add to totals for weekly average
                total_calories += calories
                total_protein += protein
                total_carbs += carbs
                total_fat += fat
        
        if weekly_data:
            # Calculate weekly averages
            avg_calories = round(total_calories / 7)
            avg_protein = round(total_protein / 7)
            avg_carbs = round(total_carbs / 7)
            avg_fat = round(total_fat / 7)
            
            # Calculate average percentages
            avg_protein_calories = avg_protein * 4
            avg_fat_calories = avg_fat * 9
            avg_carb_calories = avg_carbs * 4
            avg_total_calories = avg_protein_calories + avg_fat_calories + avg_carb_calories
            
            if avg_total_calories > 0:
                avg_protein_pct = round((avg_protein_calories / avg_total_calories) * 100)
                avg_fat_pct = round((avg_fat_calories / avg_total_calories) * 100)
                avg_carbs_pct = round((avg_carb_calories / avg_total_calories) * 100)
            else:
                avg_protein_pct = avg_fat_pct = avg_carbs_pct = 0
            
            # Add weekly average row
            weekly_data.append({
                "Day": "WEEKLY AVG",
                "Calories": avg_calories,
                "Protein": f"{avg_protein}g ({avg_protein_pct}%)",
                "Carbs": f"{avg_carbs}g ({avg_carbs_pct}%)",
                "Fat": f"{avg_fat}g ({avg_fat_pct}%)"
            })
                
            # Display as a table
            weekly_df = pd.DataFrame(weekly_data)
            st.table(weekly_df)
        else:
            st.write("No day-specific nutrition plans have been set up yet.")
    
    # Macronutrient Guidelines section
    st.subheader("What Do Macronutrients Mean?")
    
    # Create columns for each macronutrient explanation
    macro_cols = st.columns(3)
    
    with macro_cols[0]:
        st.markdown("""
        ### Protein
        - **Primary role**: Builds and repairs muscle tissue
        - **Secondary roles**: Enzyme production, immune function, hormone regulation
        - **Good sources**: Lean meats, fish, eggs, Greek yogurt, cottage cheese, tofu, tempeh, legumes
        """)
    
    with macro_cols[1]:
        st.markdown("""
        ### Carbohydrates
        - **Primary role**: Energy for high-intensity exercise
        - **Secondary roles**: Spares protein, supports brain function, regulates gut health
        - **Good sources**: Whole grains, fruits, vegetables, legumes, potatoes
        """)
    
    with macro_cols[2]:
        st.markdown("""
        ### Fat
        - **Primary role**: Hormone production and regulation
        - **Secondary roles**: Vitamin absorption, cell membrane health, energy source
        - **Good sources**: Avocados, nuts, seeds, olive oil, fatty fish, whole eggs
        """)