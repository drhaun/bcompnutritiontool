# End of Weekly Schedule page - Nutrition Targets moved to separate page
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

# Focus on weekly schedule only - nutrition targets moved to separate page
st.markdown("Create your weekly schedule to calculate your daily energy needs. Your activity levels and workout schedule will be used to determine your personalized nutrition targets.")

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
        
        st.success("Generated weekly schedule! Please review your schedule below, then proceed to the Nutrition Targets page to review and confirm your nutrition goals.")
    
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
            
            # Simplified workflow - just display next step guidance
            st.markdown("---")
            st.markdown("**Next Step:** Navigate to **Nutrition Targets** to review and confirm your nutrition goals based on this schedule.")
            
            # Auto-confirm schedule for nutrition targets calculation (hidden from user)
            if st.session_state.weekly_schedule and 'confirmed_weekly_schedule' not in st.session_state:
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

# End of Weekly Schedule page
# Nutrition Targets functionality moved to separate page: pages/5_Nutrition_Targets.py
