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
    meals_per_day = st.slider("Number of meals per day", min_value=2, max_value=8, value=4, 
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
        
        # Day selector
        selected_day = st.selectbox("Select day:", days_of_week, key="nutrition_day_selector")
        
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
        
        # Create nutrition sections
        with st.container(border=True):
            st.subheader("Calorie Target")
            
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
            
            # Create two column layout for calorie selection
            cal_cols = st.columns(2)
            
            with cal_cols[0]:
                # Choose preset or custom
                calorie_method = st.radio(
                    "Calorie target method:",
                    ["Based on goal", "Custom"],
                    horizontal=True,
                    key=f"cal_method_{selected_day}"
                )
                
                if calorie_method == "Based on goal":
                    # Use calculated target from goal type
                    st.write(f"Target calories: {default_cal}")
                    custom_day_calories = default_cal
                
            with cal_cols[1]:
                # Direct calorie input - ensure value is within bounds
                safe_value = max(min_cal, min(max_cal, default_cal))
                custom_day_calories = st.number_input(
                    "Target Calories",
                    min_value=min_cal,
                    max_value=max_cal,
                    value=safe_value,
                    step=10,
                    key=f"cal_input_{selected_day}"
                )
            
            # Ensure protein value is an integer and follows standard coefficients
            # For fat loss: 2.0g/kg or 0.9g/lb
            # For muscle gain: 1.8g/kg or 0.8g/lb
            # For maintenance: 1.6g/kg or 0.7g/lb
            if not isinstance(day_macros['protein'], (int, float)) or day_macros['protein'] <= 0:
                if user_goal_type == "lose_fat":
                    day_macros['protein'] = round(weight_kg * 2.0)  # Higher for fat loss to preserve muscle
                elif user_goal_type == "gain_muscle":
                    day_macros['protein'] = round(weight_kg * 1.8)  # High for muscle gain
                else:
                    day_macros['protein'] = round(weight_kg * 1.6)  # Moderate for maintenance
            
            # Calculate macronutrient targets
            target_calories = custom_day_calories
        
        # Protein section
        with st.container(border=True):
            st.subheader("Protein Target")
            
            # Create columns for protein input method and value
            protein_cols = st.columns(2)
            
            with protein_cols[0]:
                # Choose preset or custom
                protein_method = st.radio(
                    "Protein target method:",
                    ["g/kg", "g/lb", "% of calories", "Custom"],
                    horizontal=True,
                    key=f"protein_method_{selected_day}"
                )
                
                # Calculate protein based on method
                max_protein = int(target_calories / 4)  # Max possible protein from all calories
                
                if protein_method == "g/kg":
                    # Preset g/kg values based on goal
                    kg_options = {
                        "lose_fat": {"options": [1.6, 1.8, 2.0, 2.2, 2.4, 2.6], "default": 2.0},
                        "gain_muscle": {"options": [1.6, 1.8, 2.0, 2.2, 2.4], "default": 1.8},
                        "maintain": {"options": [1.4, 1.6, 1.8, 2.0], "default": 1.6}
                    }
                    
                    goal_presets = kg_options.get(user_goal_type, kg_options["maintain"])
                    
                    kg_coefficient = st.select_slider(
                        "Protein (g/kg of bodyweight):",
                        options=goal_presets["options"],
                        value=goal_presets["default"],
                        key=f"protein_kg_coef_{selected_day}"
                    )
                    
                    calculated_protein = round(weight_kg * kg_coefficient)
                    st.write(f"Based on your selection: {kg_coefficient}g/kg × {weight_kg:.1f}kg = {calculated_protein}g protein")
                    
                    # Use this as default value for the number input
                    default_protein = calculated_protein
                    
                elif protein_method == "g/lb":
                    # Preset g/lb values based on goal (converted from g/kg)
                    lb_options = {
                        "lose_fat": {"options": [0.7, 0.8, 0.9, 1.0, 1.1, 1.2], "default": 0.9},
                        "gain_muscle": {"options": [0.7, 0.8, 0.9, 1.0, 1.1], "default": 0.8},
                        "maintain": {"options": [0.6, 0.7, 0.8, 0.9], "default": 0.7}
                    }
                    
                    goal_presets = lb_options.get(user_goal_type, lb_options["maintain"])
                    
                    lb_coefficient = st.select_slider(
                        "Protein (g/lb of bodyweight):",
                        options=goal_presets["options"],
                        value=goal_presets["default"],
                        key=f"protein_lb_coef_{selected_day}"
                    )
                    
                    calculated_protein = round(weight_lb * lb_coefficient)
                    st.write(f"Based on your selection: {lb_coefficient}g/lb × {weight_lb:.1f}lb = {calculated_protein}g protein")
                    
                    # Use this as default value for the number input
                    default_protein = calculated_protein
                    
                elif protein_method == "% of calories":
                    # Preset % of calories options
                    pct_options = [20, 25, 30, 35, 40, 45, 50]
                    protein_pct = st.select_slider(
                        "Protein (% of calories):",
                        options=pct_options,
                        value=30,
                        key=f"protein_pct_{selected_day}"
                    )
                    
                    calculated_protein = round((target_calories * (protein_pct / 100)) / 4)
                    st.write(f"Based on your selection: {protein_pct}% of {target_calories} calories = {calculated_protein}g protein")
                    
                    # Use this as default value for the number input
                    default_protein = calculated_protein
                else:
                    # If custom selected, use previous value
                    default_protein = day_macros['protein'] if day_macros['protein'] > 0 else round(weight_kg * 1.8)
            
            with protein_cols[1]:
                # Set reasonable min/max values
                min_protein = 50
                
                # Custom protein input with step size of 10g
                protein_step = 10
                custom_protein = st.slider("Protein (g)", 
                                          min_value=50, 
                                          max_value=max_protein, 
                                          value=default_protein,
                                          step=protein_step,
                                          help="Recommended range: 1.6-2.2g per kg of body weight")
            
            # Show per-kg and per-lb metrics and guidance for protein
            protein_per_kg = round(custom_protein / weight_kg, 2)
            protein_per_lb = round(custom_protein / (weight_kg * 2.20462), 2)  # Convert to lb
            protein_per_ffm_kg = round(custom_protein / ffm_kg, 2) if ffm_kg > 0 else 0
            protein_per_ffm_lb = round(custom_protein / (ffm_kg * 2.20462), 2) if ffm_kg > 0 else 0
            protein_pct_calories = round((custom_protein * 4 / target_calories) * 100)
            
            # Protein guidance text
            st.markdown(f"""
            **Selected protein: {custom_protein}g** ({protein_pct_calories}% of calories)
            - {protein_per_kg}g/kg of bodyweight ({protein_per_lb}g/lb)
            - {protein_per_ffm_kg}g/kg of fat-free mass ({protein_per_ffm_lb}g/lb of FFM)
            """)
            
            if protein_per_kg < 1.6:
                st.warning("⚠️ This is below the recommended minimum of 1.6g/kg for maintaining muscle mass.")
            elif protein_per_kg > 2.8:
                st.warning("⚠️ This is very high. Intakes above 2.8g/kg typically don't provide additional benefits.")
            elif protein_per_kg >= 2.2:
                st.info("ℹ️ This is in the higher range, which can be beneficial during calorie restriction or intense training.")
            else:
                st.success("✅ This is within the recommended range of 1.6-2.2g/kg for most people.")
        
        # Fat section
        with st.container(border=True):
            st.subheader("Fat Target")
            
            # Create columns for fat input method and value
            fat_cols = st.columns(2)
            
            with fat_cols[0]:
                # Choose preset or custom
                fat_method = st.radio(
                    "Fat target method:",
                    ["g/kg", "g/lb", "% of calories", "Custom"],
                    horizontal=True,
                    key=f"fat_method_{selected_day}"
                )
                
                # Calculate fat based on method
                max_fat = int(target_calories / 9)  # Max possible fat from all calories
                
                if fat_method == "g/kg":
                    # Preset g/kg values
                    kg_options = [0.6, 0.8, 1.0, 1.2, 1.4, 1.6]
                    kg_coefficient = st.select_slider(
                        "Fat (g/kg of bodyweight):",
                        options=kg_options,
                        value=0.8,
                        key=f"fat_kg_coef_{selected_day}"
                    )
                    
                    calculated_fat = round(weight_kg * kg_coefficient)
                    st.write(f"Based on your selection: {kg_coefficient}g/kg × {weight_kg:.1f}kg = {calculated_fat}g fat")
                    
                    # Use this as default value for the number input
                    default_fat = calculated_fat
                    
                elif fat_method == "g/lb":
                    # Preset g/lb values (converted from g/kg)
                    lb_options = [0.3, 0.4, 0.5, 0.6, 0.7]
                    lb_coefficient = st.select_slider(
                        "Fat (g/lb of bodyweight):",
                        options=lb_options,
                        value=0.4,
                        key=f"fat_lb_coef_{selected_day}"
                    )
                    
                    calculated_fat = round(weight_lb * lb_coefficient)
                    st.write(f"Based on your selection: {lb_coefficient}g/lb × {weight_lb:.1f}lb = {calculated_fat}g fat")
                    
                    # Use this as default value for the number input
                    default_fat = calculated_fat
                    
                elif fat_method == "% of calories":
                    # Preset % of calories options
                    pct_options = [20, 25, 30, 35, 40]
                    fat_pct = st.select_slider(
                        "Fat (% of calories):",
                        options=pct_options,
                        value=30,
                        key=f"fat_pct_{selected_day}"
                    )
                    
                    calculated_fat = round((target_calories * (fat_pct / 100)) / 9)
                    st.write(f"Based on your selection: {fat_pct}% of {target_calories} calories = {calculated_fat}g fat")
                    
                    # Use this as default value for the number input
                    default_fat = calculated_fat
                else:
                    # If custom selected, use previous value
                    default_fat = custom_day_fat if 'custom_day_fat' in locals() else default_fat
            
            with fat_cols[1]:
                # Direct fat input with minimum constraint
                custom_day_fat = st.number_input(
                    "Fat (g)",
                    min_value=0,
                    max_value=300,
                    value=default_fat,
                    step=5,
                    key=f"fat_input_{selected_day}"
                )
            
            # Show per-kg and per-lb metrics and guidance for fat
            fat_per_kg = round(custom_day_fat / weight_kg, 2)
            fat_per_lb = round(custom_day_fat / (weight_kg * 2.20462), 2)  # Convert to lb
            fat_pct_calories = round((custom_day_fat * 9 / target_calories) * 100)
            
            # Fat guidance text
            st.markdown(f"""
            **Selected fat: {custom_day_fat}g** ({fat_pct_calories}% of calories)
            - {fat_per_kg}g/kg of bodyweight ({fat_per_lb}g/lb)
            """)
            
            if fat_per_kg < 0.6:
                st.warning("⚠️ This is very low. Fat intake below 0.6g/kg may affect hormone production.")
            elif fat_pct_calories < 20:
                st.warning("⚠️ This is low. Fat below 20% of calories may impact health and hormone function.")
            elif fat_pct_calories > 40:
                st.info("ℹ️ This is higher fat. Suitable for low-carb approaches, but limits carbohydrates for exercise.")
            else:
                st.success("✅ This is within the healthy range (20-40% of calories).")
        
        # Automatically calculate carbs based on remaining calories
        protein_calories = custom_protein * 4
        fat_calories = custom_day_fat * 9
        remaining_calories = target_calories - protein_calories - fat_calories
        custom_day_carbs = max(0, round(remaining_calories / 4))
        
        # Carbs section
        with st.container(border=True):
            st.subheader("Carbohydrate Target")
            
            # Carb guidance text with both kg and lb metrics
            carb_pct_calories = round((custom_day_carbs * 4 / target_calories) * 100)
            carb_per_kg = round(custom_day_carbs / weight_kg, 2)
            carb_per_lb = round(custom_day_carbs / (weight_kg * 2.20462), 2)  # Convert to lb
            
            if carb_pct_calories < 20:
                carb_guidance = "⚠️ This is very low and may impact workout performance and recovery."
            elif carb_pct_calories < 40:
                carb_guidance = "🟡 This is moderate. Adequate for many but may be low for high-intensity training."
            else:
                carb_guidance = "✅ This is a moderate to high carbohydrate intake, good for fueling workouts."
            
            st.markdown(f"""
            **Calculated carbs: {custom_day_carbs}g** ({carb_pct_calories}% of calories)
            - {carb_per_kg}g/kg of bodyweight ({carb_per_lb}g/lb)
            - {carb_guidance}
            """)
            
            # Carb adjustment if needed
            carb_adjustment = st.checkbox("Adjust carbs manually?", key=f"carb_adjust_{selected_day}")
            
            if carb_adjustment:
                custom_day_carbs = st.slider("Carbohydrates (g)", 
                                            min_value=0, 
                                            max_value=int(target_calories/4),  # Max possible carbs
                                            value=custom_day_carbs,
                                            step=10,
                                            key=f"carb_input_{selected_day}")
                
                # Recalculate total calories if carbs are adjusted
                adjusted_calories = protein_calories + fat_calories + (custom_day_carbs * 4)
                st.write(f"Adjusted total calories: {adjusted_calories} ({adjusted_calories - target_calories:+} from target)")
        
        # Save this day's nutrition targets
        if st.button("Save Nutrition Targets", type="primary", key=f"save_nutrition_{selected_day}"):
            # Update day's nutrition data
            st.session_state.day_specific_nutrition[selected_day] = {
                "target_calories": target_calories,
                "protein": custom_protein,
                "fat": custom_day_fat,
                "carbs": custom_day_carbs
            }
            
            st.success(f"Saved nutrition targets for {selected_day}!")
        
        # Display weekly overview if all days have been set up
        if len(st.session_state.day_specific_nutrition) == 7:
            st.subheader("Weekly Nutrition Overview")
            
            # Calculate weekly averages
            weekly_data = []
            
            # Calculate averages
            total_calories = 0
            total_protein = 0
            total_fat = 0
            total_carbs = 0
            
            for day in days_of_week:
                day_nutrition = st.session_state.day_specific_nutrition.get(day, {})
                if day_nutrition:
                    weekly_data.append({
                        "Day": day,
                        "Calories": day_nutrition.get('target_calories', 0),
                        "Protein": f"{day_nutrition.get('protein', 0)}g",
                        "Carbs": f"{day_nutrition.get('carbs', 0)}g",
                        "Fat": f"{day_nutrition.get('fat', 0)}g"
                    })
                    
                    total_calories += day_nutrition.get('target_calories', 0)
                    total_protein += day_nutrition.get('protein', 0)
                    total_fat += day_nutrition.get('fat', 0)
                    total_carbs += day_nutrition.get('carbs', 0)
            
            # Calculate averages
            avg_calories = round(total_calories / 7)
            avg_protein = round(total_protein / 7)
            avg_fat = round(total_fat / 7)
            avg_carbs = round(total_carbs / 7)
            
            # Calculate percentages of total calories
            avg_protein_calories = avg_protein * 4
            avg_fat_calories = avg_fat * 9
            avg_carb_calories = avg_carbs * 4
            avg_total_calories = avg_protein_calories + avg_fat_calories + avg_carb_calories
            
            avg_protein_pct = round((avg_protein_calories / avg_total_calories) * 100)
            avg_fat_pct = round((avg_fat_calories / avg_total_calories) * 100)
            avg_carbs_pct = round((avg_carb_calories / avg_total_calories) * 100)
            
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