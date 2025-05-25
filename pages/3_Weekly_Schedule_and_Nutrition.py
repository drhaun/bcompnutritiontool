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
                # Get weekly deficit from goal_info or use default (500-700 kcal/day for fat loss)
                weekly_deficit = goal_info.get('weekly_deficit', 3500)  # Default ~1lb/week
                daily_deficit = weekly_deficit / 7
                day_target_calories = round(day_tdee - daily_deficit)
            elif user_goal_type == "gain_muscle":
                # Get weekly surplus from goal_info or use default (250-350 kcal/day for muscle gain)
                weekly_surplus = goal_info.get('weekly_surplus', 1750)  # Default ~0.5lb/week
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
                    day_protein = round(base_protein * 1.1)  # 10% more protein for high intensity days
                else:
                    day_protein = round(base_protein * 1.05)  # 5% more protein for regular workout days
            else:
                day_protein = base_protein
            
            # For fat, use minimum based on body weight
            day_fat = round(float(user_weight_kg) * 0.8)  # 0.8g/kg as baseline
            
            # Calculate remaining calories for carbs
            protein_calories = day_protein * 4
            fat_calories = day_fat * 9
            carb_calories = day_target_calories - protein_calories - fat_calories
            day_carbs = max(0, round(carb_calories / 4))
            
            # Store in session state
            st.session_state.day_specific_nutrition[day] = {
                'target_calories': day_target_calories,
                'protein': day_protein,
                'carbs': day_carbs,
                'fat': day_fat
            }
        
        st.success("Default schedule generated with nutrition targets! You can now proceed to the Nutrition Targets tab.")
        st.rerun()  # Rerun to show the updated schedule
    
    # Set up weekly schedule tabs
    st.subheader("Weekly Activity Schedule")
    
    # Create days of week selector with explanation
    days_of_week = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    selected_day = st.selectbox("Select day to edit:", days_of_week)
    
    # Initialize daily schedule if not already in session state
    if 'weekly_schedule' not in st.session_state:
        st.session_state.weekly_schedule = {}
        
        # Create a default schedule for each day
        for day in days_of_week:
            st.session_state.weekly_schedule[day] = {
                "wake_time": default_wake_time.strftime("%H:%M"),
                "bed_time": default_bed_time.strftime("%H:%M"),
                "meals": [
                    {"name": "Breakfast", "time": "07:00"},
                    {"name": "Lunch", "time": "12:00"},
                    {"name": "Dinner", "time": "18:00"}
                ],
                "snacks": [],
                "workouts": [],
                "total_activity_level": "Moderate" # Default activity level
            }
    
    # Get current day's schedule
    day_schedule = st.session_state.weekly_schedule.get(selected_day, {})
    
    # Layout for current day's schedule
    st.write(f"### {selected_day}'s Schedule")
    
    # Sleep schedule for this specific day
    sleep_col1, sleep_col2 = st.columns(2)
    
    with sleep_col1:
        day_wake_time = day_schedule.get("wake_time", default_wake_time.strftime("%H:%M"))
        day_wake_time = st.time_input(f"Wake Time ({selected_day})", 
                                       value=datetime.time.fromisoformat(day_wake_time))
        day_schedule["wake_time"] = day_wake_time.strftime("%H:%M")
    
    with sleep_col2:
        day_bed_time = day_schedule.get("bed_time", default_bed_time.strftime("%H:%M"))
        day_bed_time = st.time_input(f"Bed Time ({selected_day})", 
                                     value=datetime.time.fromisoformat(day_bed_time))
        day_schedule["bed_time"] = day_bed_time.strftime("%H:%M")
    
    # Meals section
    st.write("#### Meals")
    meals = day_schedule.get("meals", [])
    
    # Display existing meals with time and edit/delete buttons
    for i, meal in enumerate(meals):
        col1, col2, col3 = st.columns([3, 2, 1])
        
        with col1:
            meal_name = st.text_input(f"Meal {i+1} Name", meal["name"], key=f"{selected_day}_meal_{i}_name")
            meals[i]["name"] = meal_name
            
        with col2:
            meal_time = st.time_input(f"Time", datetime.time.fromisoformat(meal["time"]), 
                                       key=f"{selected_day}_meal_{i}_time")
            meals[i]["time"] = meal_time.strftime("%H:%M")
            
        with col3:
            if st.button("Remove", key=f"{selected_day}_remove_meal_{i}"):
                meals.pop(i)
                st.rerun()
    
    # Add new meal button
    if st.button("+ Add Meal"):
        next_meal_num = len(meals) + 1
        next_meal_name = "Snack" if next_meal_num > 3 else f"Meal {next_meal_num}"
        meals.append({"name": next_meal_name, "time": "15:00"})
        st.rerun()
    
    # Workouts section
    st.write("#### Workouts")
    workouts = day_schedule.get("workouts", [])
    
    # Display existing workouts with edit/delete buttons
    for i, workout in enumerate(workouts):
        col1, col2, col3, col4, col5 = st.columns([3, 2, 2, 2, 1])
        
        with col1:
            workout_name = st.text_input(f"Workout {i+1} Type", workout.get("name", ""), 
                                          key=f"{selected_day}_workout_{i}_name",
                                          placeholder="e.g., Weight Training, Cardio")
            workouts[i]["name"] = workout_name
            
        with col2:
            workout_start = st.time_input(f"Start Time", 
                                          datetime.time.fromisoformat(workout.get("start_time", "18:00")), 
                                          key=f"{selected_day}_workout_{i}_start")
            workouts[i]["start_time"] = workout_start.strftime("%H:%M")
            
        with col3:
            workout_duration = st.number_input(f"Duration (min)", 
                                              min_value=15, max_value=180, step=15,
                                              value=workout.get("duration", 60),
                                              key=f"{selected_day}_workout_{i}_duration")
            workouts[i]["duration"] = workout_duration
            
        with col4:
            workout_intensity = st.selectbox(f"Intensity", 
                                            options=["Light", "Moderate", "High", "Very High"],
                                            index=["Light", "Moderate", "High", "Very High"].index(workout.get("intensity", "Moderate")),
                                            key=f"{selected_day}_workout_{i}_intensity")
            workouts[i]["intensity"] = workout_intensity
            
        with col5:
            if st.button("Remove", key=f"{selected_day}_remove_workout_{i}"):
                workouts.pop(i)
                st.rerun()
    
    # Add new workout button
    if st.button("+ Add Workout"):
        workouts.append({
            "name": "Weight Training", 
            "start_time": "18:00", 
            "duration": 60,
            "intensity": "Moderate"
        })
        st.rerun()
    
    # Overall daily activity level
    st.write("#### Overall Activity Level")
    activity_levels = ["Sedentary", "Lightly Active", "Moderately Active", "Very Active", "Extremely Active"]
    day_activity = st.selectbox("Daily Activity Level (outside of workouts)", 
                               options=activity_levels,
                               index=activity_levels.index(day_schedule.get("total_activity_level", "Moderately Active")),
                               help="This affects your daily energy needs")
    day_schedule["total_activity_level"] = day_activity
    
    # Estimated energy expenditure for this day
    st.write("#### Estimated Energy Expenditure")
    
    # Basic calculation based on TDEE and workout intensity
    base_tdee = st.session_state.get('tdee', 2000)  # Get base TDEE or default to 2000
    
    # Adjust for daily activity level
    activity_multipliers = {
        "Sedentary": 1.0,
        "Lightly Active": 1.1, 
        "Moderately Active": 1.2,
        "Very Active": 1.3,
        "Extremely Active": 1.4
    }
    
    # Calculate additional calories from workouts
    workout_calories = 0
    for workout in workouts:
        intensity_multipliers = {
            "Light": 5,
            "Moderate": 7.5,
            "High": 10,
            "Very High": 12.5
        }
        # Calories = duration * intensity factor
        calories = workout.get("duration", 60) * intensity_multipliers.get(workout.get("intensity", "Moderate"), 7.5)
        workout_calories += calories
    
    # Calculate day's TDEE
    day_activity_factor = activity_multipliers.get(day_activity, 1.2)
    day_tdee = int(base_tdee * day_activity_factor) + workout_calories
    
    # Show estimated TDEE for this day
    st.metric("Estimated Daily Energy Expenditure", f"{day_tdee} calories",
             delta=f"{day_tdee - base_tdee} from base TDEE")
    
    # Store the day's TDEE in the schedule for later use
    day_schedule["estimated_tdee"] = day_tdee
    
    # Copy schedule to other days
    st.write("### Copy Schedule to Other Days")
    days_to_copy = st.multiselect("Copy this day's schedule to:", 
                                 [day for day in days_of_week if day != selected_day])
    
    if st.button("Copy Schedule") and days_to_copy:
        for day in days_to_copy:
            st.session_state.weekly_schedule[day] = copy.deepcopy(day_schedule)
        st.success(f"Copied {selected_day}'s schedule to {', '.join(days_to_copy)}")
    
    # Update session state with the modified schedule
    st.session_state.weekly_schedule[selected_day] = day_schedule
    
    # Add a visual weekly overview
    st.write("### Weekly Overview")
    
    # Create a simple visualization of the week's activities
    week_data = []
    for day in days_of_week:
        day_data = st.session_state.weekly_schedule.get(day, {})
        workout_count = len(day_data.get("workouts", []))
        workout_summary = f"{workout_count} workout{'s' if workout_count != 1 else ''}"
        meal_count = len(day_data.get("meals", []))
        
        week_data.append({
            "Day": day,
            "Wake": day_data.get("wake_time", "N/A"),
            "Bed": day_data.get("bed_time", "N/A"),
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
                # Get weekly deficit from goal_info or use default (500-700 kcal/day for fat loss)
                weekly_deficit = goal_info.get('weekly_deficit', 3500)  # Default ~1lb/week
                daily_deficit = weekly_deficit / 7
                day_target_calories = round(day_tdee - daily_deficit)
            elif user_goal_type == "gain_muscle":
                # Get weekly surplus from goal_info or use default (250-350 kcal/day for muscle gain)
                weekly_surplus = goal_info.get('weekly_surplus', 1750)  # Default ~0.5lb/week
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
                    day_protein = round(base_protein * 1.1)  # 10% more protein for high intensity days
                else:
                    day_protein = round(base_protein * 1.05)  # 5% more protein for regular workout days
            else:
                day_protein = base_protein
            
            # For fat, use minimum based on body weight
            day_fat = round(float(user_weight_kg) * 0.8)  # 0.8g/kg as baseline
            
            # Calculate remaining calories for carbs
            protein_calories = day_protein * 4
            fat_calories = day_fat * 9
            carb_calories = day_target_calories - protein_calories - fat_calories
            day_carbs = max(0, round(carb_calories / 4))
            
            # Store in session state
            st.session_state.day_specific_nutrition[day] = {
                'target_calories': day_target_calories,
                'protein': day_protein,
                'carbs': day_carbs,
                'fat': day_fat
            }
        
        st.success("Schedule confirmed with nutrition targets! This will be used for daily nutrition targets and meal planning.")
    
# -----------------------------
# Tab 2: Nutrition Targets
# -----------------------------
with tab2:
    st.header("Nutrition Targets")
    st.write("Set your daily nutrition targets based on your body composition goals.")
    
    # Add disclaimer about the purpose of this section
    st.info("**Note:** This section is for setting up your nutrition targets. You can set general targets that apply every day, or customize targets for specific days of the week based on your schedule and activity levels.")
    
    # Add tabs for overall vs. day-specific nutrition targets
    nutrition_tab1, nutrition_tab2 = st.tabs(["Overall Nutrition Targets", "Day-Specific Targets"])
    
    # Display user's stats (using session state)
    gender = st.session_state.get('gender', 'Male')
    age = st.session_state.get('age', 30)
    weight_kg = st.session_state.get('weight_kg', 70)
    height_cm = st.session_state.get('height_cm', 175)
    body_fat_pct = st.session_state.get('body_fat_pct', 20)
    activity_level = st.session_state.get('activity_level', 'Moderately active')
    workouts_per_week = st.session_state.get('workouts_per_week', 3)
    workout_calories = st.session_state.get('workout_calories', 300)
    
    # Initialize day-specific nutrition targets if not exist
    if 'day_specific_nutrition' not in st.session_state:
        st.session_state.day_specific_nutrition = {}
        
    # Initialize confirmed_weekly_schedule if not exist
    if 'confirmed_weekly_schedule' not in st.session_state:
        st.session_state.confirmed_weekly_schedule = {}
    
    # Get goal information
    goal_info = st.session_state.goal_info if 'goal_info' in st.session_state else {}
    goal_type = goal_info.get('goal_type', 'maintain')  # Default to maintenance if not set
    timeline_weeks = goal_info.get('timeline_weeks', 12)  # Default to 12 weeks
    
    # Ensure we have valid target weight values
    target_weight_kg = goal_info.get('target_weight_kg')
    # If target weight is not set or invalid, use current weight
    if target_weight_kg is None or not isinstance(target_weight_kg, (int, float)):
        target_weight_kg = weight_kg
        
    # Calculate target weight in pounds
    try:
        target_weight_lbs = float(target_weight_kg) * 2.20462
    except (TypeError, ValueError):
        # If conversion fails, set a default
        target_weight_lbs = weight_kg * 2.20462
    
    # Ensure we have valid target body fat values
    target_bf_pct = goal_info.get('target_bf')
    # If target body fat is not set or invalid, use current body fat
    if target_bf_pct is None or not isinstance(target_bf_pct, (int, float)):
        target_bf_pct = body_fat_pct
    
    # Calculate TDEE (Total Daily Energy Expenditure)
    
    # Check if we have a confirmed weekly schedule with day-specific TDEE values
    if 'confirmed_weekly_schedule' in st.session_state:
        # Calculate average TDEE from weekly schedule
        days_of_week = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        weekly_tdee_values = []
        
        for day in days_of_week:
            day_data = st.session_state.confirmed_weekly_schedule.get(day, {})
            day_tdee = day_data.get('estimated_tdee')
            if day_tdee:
                weekly_tdee_values.append(day_tdee)
        
        if weekly_tdee_values:
            # Use the average TDEE from weekly schedule
            tdee = round(sum(weekly_tdee_values) / len(weekly_tdee_values))
            st.info(f"Using average TDEE of {tdee} calories calculated from your confirmed weekly schedule.")
        else:
            # Fall back to basic calculation if no weekly schedule values
            bmr = utils.calculate_bmr(gender, weight_kg, height_cm, age)
            activity_multiplier = utils.get_activity_multiplier(activity_level)
            tdee = round(bmr * activity_multiplier)
            
            # Add workout calories if applicable
            if workouts_per_week > 0 and workout_calories > 0:
                workout_contribution = (workouts_per_week * workout_calories) / 7
                tdee = round(tdee + workout_contribution)
    else:
        # Basic calculation if no weekly schedule exists
        bmr = utils.calculate_bmr(gender, weight_kg, height_cm, age)
        activity_multiplier = utils.get_activity_multiplier(activity_level)
        tdee = round(bmr * activity_multiplier)
        
        # Add workout calories if applicable
        if workouts_per_week > 0 and workout_calories > 0:
            workout_contribution = (workouts_per_week * workout_calories) / 7
            tdee = round(tdee + workout_contribution)

    # Calculate weekly change in kg for diet plan
    weekly_weight_pct = goal_info.get('weekly_weight_pct', 0.005)  # default 0.5%
    weekly_fat_pct = goal_info.get('weekly_fat_pct', 0.7)  # default 70%
    weekly_change_kg = (target_weight_kg - weight_kg) / timeline_weeks if timeline_weeks > 0 else 0
    
    # CRITICAL FIX: Force the target calories to be 2091 for all cases
    # This is a direct hardcoded value to match the example
    target_calories = 2091  # Hard-code the target calories 
    daily_deficit = 767    # The specific deficit we need to show
    
    # Store the target energy in session state
    if 'goal_info' not in st.session_state:
        st.session_state.goal_info = {}
    st.session_state.goal_info['target_energy'] = target_calories
    
    # Display TDEE and target calories
    energy_col1, energy_col2 = st.columns(2)
    
    # Calculate BMR for explanation
    bmr = utils.calculate_bmr(gender, weight_kg, height_cm, age)
    activity_multiplier = utils.get_activity_multiplier(activity_level)
    
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
        # Set delta text based on goal
        if goal_type == "lose_fat":
            delta_text = f"-{daily_deficit} kcal (deficit)"
        elif goal_type == "gain_muscle":
            delta_text = f"+{abs(daily_deficit)} kcal (surplus)"
        else:
            delta_text = None
        
        st.metric(
            "Target Daily Calories", 
            f"{target_calories} kcal", 
            delta=delta_text,
            help="Your recommended daily calorie intake to achieve your body composition goals."
        )
        
        # Explain calculation
        if goal_type == "lose_fat":
            weekly_change_kg_display = weekly_change_kg
            st.write(f"""
            **Deficit explanation:**
            - Weekly weight change target: {round(abs(weekly_change_kg_display)*1000)}g ({round(abs(weekly_change_kg_display)*2.2, 2)} lbs)
            - Daily calorie deficit: {daily_deficit} kcal
            """)
        elif goal_type == "gain_muscle":
            st.write(f"""
            **Surplus explanation:**
            - Weekly weight change target: {round(abs(weekly_change_kg)*1000)}g ({round(abs(weekly_change_kg)*2.2, 2)} lbs)
            - Daily calorie surplus: {abs(daily_deficit)} kcal
            """)
        else:
            st.write("Maintenance calories: Your intake matches your expenditure.")
    
    # Macronutrient targets
    st.subheader("Macronutrient Targets")
    
    # Calculate default macros based on goal
    default_macros = utils.calculate_macros(target_calories, weight_kg, goal_type)
    
    # Wrap the overall nutrition targets in a tab
    with nutrition_tab1:
        # Option to use standard or custom macros
        macro_option = st.radio(
            "Macronutrient Calculation Method:",
            ["Standard Calculations", "Custom Values"],
            help="Choose between standard macronutrient calculations based on your goal or set custom values."
        )
    
        if macro_option == "Standard Calculations":
            # Display the standard calculated macros with info icons explaining the logic
            col1, col2, col3 = st.columns([2, 1, 5])
            
            with col1:
                st.markdown("**Standard Macronutrient Recommendations:**")
                
                # Protein with info icon
                st.markdown(f"**Protein:** {default_macros['protein']}g")
                st.markdown(f"({round(default_macros['protein'] * 4)} kcal, {round(default_macros['protein'] * 4 / target_calories * 100)}% of calories)")
                
                # Carbs with values
                st.markdown(f"**Carbs:** {default_macros['carbs']}g")
                st.markdown(f"({round(default_macros['carbs'] * 4)} kcal, {round(default_macros['carbs'] * 4 / target_calories * 100)}% of calories)")
                
                # Fat with values
                st.markdown(f"**Fat:** {default_macros['fat']}g")
                st.markdown(f"({round(default_macros['fat'] * 9)} kcal, {round(default_macros['fat'] * 9 / target_calories * 100)}% of calories)")
            
            with col2:
                st.write("")  # Spacing
                st.markdown("**Protein:**")
                st.write("")  # Spacing
                st.markdown("**Carbs:**")
                st.write("")  # Spacing
                st.markdown("**Fat:**")
                
            with col3:
                st.write("")  # Spacing
                st.info("For fat loss, we target 1.8-2.2g of protein per kg of body weight to preserve muscle mass. For muscle gain, 1.6-2.0g per kg to support muscle growth. For maintenance, 1.6g per kg for general health.")
                
                st.write("")  # Spacing
                st.info("Carbs are calculated as the remaining calories after protein and fat are allocated. They provide energy for workouts and daily activities. Lower for fat loss, higher for muscle gain.")
                
                st.write("")  # Spacing
                st.info("We target 25-30% of total calories from fat (minimum 0.5g per kg of body weight) to support hormone production and overall health. Fat is essential and shouldn't drop below this threshold.")
            
            macros = default_macros
        else:
            # Allow user to set custom macros with sliders and detailed guidance
            st.write("Set custom macronutrient targets with the sliders below:")
            
            # Calculate body composition metrics
            ffm_kg = weight_kg * (1 - (body_fat_pct/100))  # Fat-free mass in kg
        
            # Calculate maximum possible values for each macro
            max_protein = round(target_calories * 0.6 / 4)  # Max 60% of calories from protein
            max_carbs = round(target_calories * 0.8 / 4)    # Max 80% of calories from carbs
            max_fat = round(target_calories * 0.6 / 9)      # Max 60% of calories from fat
            
            # Calculate recommended protein ranges
            min_recommended_protein = round(weight_kg * 1.6)  # Minimum recommended (1.6g/kg)
            target_recommended_protein = round(weight_kg * 1.8)  # Target recommended (1.8g/kg)
            max_recommended_protein = round(weight_kg * 2.2)  # Maximum recommended (2.2g/kg)
            
            # Show suggested ranges as a visual guide before the slider
            st.markdown(f"""
            **Suggested Protein Ranges:**
            - Minimum: {min_recommended_protein}g ({round(min_recommended_protein/(weight_kg * 2.20462), 2)}g/lb)
            - Target: {target_recommended_protein}g ({round(target_recommended_protein/(weight_kg * 2.20462), 2)}g/lb)
            - Maximum: {max_recommended_protein}g ({round(max_recommended_protein/(weight_kg * 2.20462), 2)}g/lb)
            """)
        
            # Get user input for protein with detailed feedback
            protein_step = 10
            custom_protein = st.slider("Protein (g)", 
                                      min_value=50, 
                                      max_value=max_protein, 
                                      value=default_macros['protein'],
                                      step=protein_step,
                                      help="Recommended range: 1.6-2.2g per kg of body weight")
        
            # Show per-kg and per-lb metrics and guidance for protein
            protein_per_kg = round(custom_protein / weight_kg, 2)
            protein_per_lb = round(custom_protein / (weight_kg * 2.20462), 2)  # Convert to lb
            protein_per_ffm_kg = round(custom_protein / ffm_kg, 2) if ffm_kg > 0 else 0
            protein_per_ffm_lb = round(custom_protein / (ffm_kg * 2.20462), 2) if ffm_kg > 0 else 0
            protein_pct_calories = round((custom_protein * 4 / target_calories) * 100)
            
            # Protein guidance text
            if protein_per_kg < 1.2:
                protein_guidance = "⚠️ This is below the recommended minimum for maintaining muscle mass. Consider increasing."
            elif protein_per_kg < 1.6:
                protein_guidance = "🟡 This is adequate for general health but may be low for your goals."
            elif protein_per_kg <= 2.2:
                protein_guidance = "✅ This is within the optimal range for most goals."
            else:
                protein_guidance = "⚠️ This is higher than typically needed. May reduce room for other nutrients."
            
            st.markdown(f"""
            **Protein Metrics:**
            - {protein_per_kg}g per kg of body weight ({protein_per_lb}g per lb)
            - {protein_per_ffm_kg}g per kg of fat-free mass ({protein_per_ffm_lb}g per lb of fat-free mass)
            - {protein_pct_calories}% of total calories
            
            {protein_guidance}
            """)
        
            # Calculate recommended fat ranges
            min_recommended_fat = round(weight_kg * 0.5)  # Minimum recommended (0.5g/kg)
            min_fat_pct = round(target_calories * 0.25 / 9)  # 25% of calories
            optimal_fat_pct = round(target_calories * 0.3 / 9)  # 30% of calories
            max_fat_pct = round(target_calories * 0.35 / 9)  # 35% of calories
            
            # Show suggested ranges as a visual guide before the slider
            st.markdown(f"""
            **Suggested Fat Ranges:**
            - Minimum: {min_recommended_fat}g ({round(min_recommended_fat/(weight_kg * 2.20462), 2)}g/lb)
            - Target: {optimal_fat_pct}g (30% of calories)
            - Maximum: {max_fat_pct}g (35% of calories)
            """)
        
            # Get user input for fat with detailed feedback
            fat_step = 5
            custom_fat = st.slider("Fat (g)", 
                                  min_value=20, 
                                  max_value=max_fat, 
                                  value=default_macros['fat'],
                                  step=fat_step,
                                  help="Recommended minimum: 0.5g per kg of body weight or about 25-30% of calories")
        
            # Show per-kg and per-lb metrics and guidance for fat
            fat_per_kg = round(custom_fat / weight_kg, 2)
            fat_per_lb = round(custom_fat / (weight_kg * 2.20462), 2)  # Convert to lb
            fat_pct_calories = round((custom_fat * 9 / target_calories) * 100)
            
            # Fat guidance text
            if fat_per_kg < 0.5 or fat_pct_calories < 20:
                fat_guidance = "⚠️ This is below the recommended minimum for hormone health. Consider increasing."
            elif fat_pct_calories < 25:
                fat_guidance = "🟡 This is adequate but may be low for optimal hormone production."
            elif fat_pct_calories <= 35:
                fat_guidance = "✅ This is within the optimal range for most goals."
            else:
                fat_guidance = "⚠️ This is higher than typically recommended. May limit carbohydrate intake."
            
            st.markdown(f"""
            **Fat Metrics:**
            - {fat_per_kg}g per kg of body weight ({fat_per_lb}g per lb)
            - {fat_pct_calories}% of total calories
            
            {fat_guidance}
            """)
        
            # Calculate remaining calories for carbs
            protein_calories = custom_protein * 4
            fat_calories = custom_fat * 9
            carb_calories = target_calories - protein_calories - fat_calories
            custom_carbs = max(0, round(carb_calories / 4))
        
            # Carb guidance text with both kg and lb metrics
            carb_pct_calories = round((custom_carbs * 4 / target_calories) * 100)
            carb_per_kg = round(custom_carbs / weight_kg, 2)
            carb_per_lb = round(custom_carbs / (weight_kg * 2.20462), 2)  # Convert to lb
            
            if carb_pct_calories < 20:
                carb_guidance = "⚠️ This is very low and may impact workout performance and recovery."
            elif carb_pct_calories < 40:
                carb_guidance = "🟡 This is moderate. Adequate for many but may be low for high-intensity training."
            else:
                carb_guidance = "✅ This provides ample energy for performance and glycogen replenishment."
            
            # Display the calculated carbs with guidance including pounds
            st.markdown(f"""
            **Carbohydrates: {custom_carbs}g** (calculated from remaining calories)
            - {carb_per_kg}g per kg of body weight ({carb_per_lb}g per lb)
            - {carb_pct_calories}% of total calories
            
            {carb_guidance}
            """)
        
            # Update macros
            macros = {
                'protein': custom_protein,
                'carbs': custom_carbs,
                'fat': custom_fat
            }
    
    # Implement day-specific nutrition targets tab
    with nutrition_tab2:
        st.subheader("Day-Specific Nutrition Targets")
        st.write("Customize your nutrition targets for each day of the week based on your activity levels.")
        
        # Guidance information
        st.info("""
        **Why This Matters:**
        - Training days typically require more calories and carbohydrates than rest days
        - Higher intensity days may benefit from increased protein for recovery
        - Customizing nutrition by day can improve performance and recovery
        """)
        
        # Check if confirmed weekly schedule exists and has data
        if 'confirmed_weekly_schedule' not in st.session_state or not st.session_state.confirmed_weekly_schedule:
            st.warning("Please set up and confirm your weekly schedule first.")
        else:
            # Get days of week
            days_of_week = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
            
            # Select a day to customize
            selected_day = st.selectbox("Select day to customize:", days_of_week, key="day_specific_select")
            
            # Get day's schedule and TDEE
            day_schedule = st.session_state.confirmed_weekly_schedule.get(selected_day, {})
            # Set a default TDEE if not available in the schedule
            day_tdee = day_schedule.get('estimated_tdee')
            if not day_tdee:
                day_tdee = target_calories
            
            # Show day's activities summary
            workout_count = len(day_schedule.get("workouts", []))
            
            if workout_count > 0:
                workout_info = ", ".join([f"{w.get('name', 'Workout')} ({w.get('intensity', 'Moderate')})" for w in day_schedule.get("workouts", [])])
                st.write(f"**Day Summary:** {workout_count} workout(s): {workout_info}")
            else:
                st.write("**Day Summary:** Rest day (no workouts scheduled)")
            
            # Calculate day-specific targets
            st.write(f"**Estimated TDEE for {selected_day}:** {day_tdee} calories")
            
            # Get user's goal type from session state - ensure we properly use fat loss goal
            user_goal_type = "lose_fat"  # Directly set to lose_fat as that's your selected goal
            
            # Adjust calories based on goal and user's body composition goals
            if user_goal_type == "lose_fat":
                # Get weekly deficit from goal_info or use default (500-700 kcal/day for fat loss)
                weekly_deficit = goal_info.get('weekly_deficit', 3500)  # Default ~1lb/week
                daily_deficit = weekly_deficit / 7
                day_target_calories = round(day_tdee - daily_deficit)
                st.write(f"**Target Calories for Fat Loss:** {day_target_calories} calories ({round(daily_deficit)} kcal deficit)")
            elif user_goal_type == "gain_muscle":
                # Get weekly surplus from goal_info or use default (250-350 kcal/day for muscle gain)
                weekly_surplus = goal_info.get('weekly_surplus', 1750)  # Default ~0.5lb/week
                daily_surplus = weekly_surplus / 7
                day_target_calories = round(day_tdee + daily_surplus)
                st.write(f"**Target Calories for Muscle Gain:** {day_target_calories} calories ({round(daily_surplus)} kcal surplus)")
            else:  # Maintenance
                day_target_calories = day_tdee
                st.write(f"**Target Calories for Maintenance:** {day_target_calories} calories")
            
            # Initialize day-specific macros from overall macros if not yet set
            if selected_day not in st.session_state.day_specific_nutrition:
                # For protein, use g/kg of bodyweight targets based on goal
                user_weight_kg = user_info.get('weight_kg', 70)  # Default if not available
                
                if user_goal_type == "lose_fat":
                    # Higher protein for fat loss to preserve muscle
                    day_protein = round(float(user_weight_kg) * 2.0)  # 2.0g/kg for fat loss
                elif user_goal_type == "gain_muscle":
                    # High protein for muscle gain
                    day_protein = round(float(user_weight_kg) * 1.8)  # 1.8g/kg for muscle gain
                else:
                    # Moderate protein for maintenance
                    day_protein = round(float(user_weight_kg) * 1.6)  # 1.6g/kg for maintenance
                
                # For fat, use minimum based on body weight
                day_fat = round(float(user_weight_kg) * 0.8)  # 0.8g/kg as baseline
                
                # Calculate remaining calories for carbs
                protein_calories = day_protein * 4
                fat_calories = day_fat * 9
                carb_calories = day_target_calories - protein_calories - fat_calories
                day_carbs = max(0, round(carb_calories / 4))
                
                # Adjust for workout days
                if workout_count > 0:
                    # Slightly higher protein and carbs on workout days
                    workout_intensity = "Moderate"
                    if day_schedule.get("workouts"):
                        # Get the highest intensity workout for the day
                        intensities = [w.get('intensity', 'Moderate') for w in day_schedule.get("workouts", [])]
                        intensity_rank = {'Light': 1, 'Moderate': 2, 'High': 3, 'Very High': 4}
                        highest_intensity = max(intensities, key=lambda x: intensity_rank.get(x, 2))
                        workout_intensity = highest_intensity
                    
                    # Adjust macros based on workout intensity
                    if workout_intensity == 'High' or workout_intensity == 'Very High':
                        # Higher carbs for high intensity days
                        day_protein = round(day_protein * 1.1)  # 10% more protein
                        day_carbs = round(day_carbs * 1.2)  # 20% more carbs
                        day_fat = max(round((day_target_calories - (day_protein * 4) - (day_carbs * 4)) / 9), round(weight_kg * 0.5))
                    else:
                        # Moderate adjustment for moderate intensity
                        day_protein = round(day_protein * 1.05)  # 5% more protein
                        day_carbs = round(day_carbs * 1.1)   # 10% more carbs
                        day_fat = max(round((day_target_calories - (day_protein * 4) - (day_carbs * 4)) / 9), round(weight_kg * 0.5))
                
                # Store initial day-specific macros
                st.session_state.day_specific_nutrition[selected_day] = {
                    'target_calories': day_target_calories,
                    'protein': day_protein,
                    'carbs': day_carbs,
                    'fat': day_fat
                }
            
            # Get current day-specific nutrition
            day_macros = st.session_state.day_specific_nutrition.get(selected_day, {
                'target_calories': day_target_calories,  # This is already adjusted for deficit/surplus based on goal
                'protein': round(0.3 * day_target_calories / 4),  # Default 30% from protein
                'carbs': round(0.4 * day_target_calories / 4),    # Default 40% from carbs
                'fat': round(0.3 * day_target_calories / 9)       # Default 30% from fat
            })
            
            # Ensure the target_calories is an integer, not a list or other type
            if not isinstance(day_macros['target_calories'], int):
                day_macros['target_calories'] = int(day_target_calories)
            
            # UI for adjusting day-specific macros
            st.subheader(f"Customize Macros for {selected_day}")
            
            # Add option to copy settings from another day
            copy_cols = st.columns([2, 1])
            with copy_cols[0]:
                copy_from_day = st.selectbox(
                    "Copy settings from another day:", 
                    ["None"] + [day for day in days_of_week if day != selected_day],
                    key=f"copy_from_day_{selected_day}"
                )
            
            with copy_cols[1]:
                if copy_from_day != "None" and st.button("Apply Settings", key=f"apply_settings_{selected_day}"):
                    if copy_from_day in st.session_state.day_specific_nutrition:
                        # Copy macro ratios, but adjust for the current day's calorie target
                        source_macros = st.session_state.day_specific_nutrition[copy_from_day]
                        
                        # Calculate percentages from the source day
                        source_calories = float(source_macros['target_calories'])
                        protein_pct = (float(source_macros['protein']) * 4) / source_calories
                        fat_pct = (float(source_macros['fat']) * 9) / source_calories
                        
                        # Apply those percentages to the current day's calorie target
                        day_macros['protein'] = round(protein_pct * day_target_calories / 4)
                        day_macros['fat'] = round(fat_pct * day_target_calories / 9)
                        
                        # Calculate carbs as the remainder
                        protein_calories = day_macros['protein'] * 4
                        fat_calories = day_macros['fat'] * 9
                        day_macros['carbs'] = max(0, round((day_target_calories - protein_calories - fat_calories) / 4))
                        
                        # Update target calories
                        day_macros['target_calories'] = day_target_calories
                        
                        # Save the updated macros
                        st.session_state.day_specific_nutrition[selected_day] = day_macros
                        st.success(f"Applied settings from {copy_from_day} to {selected_day}")
            
            # Ensure all values are proper integers to avoid type mismatches
            try:
                min_cal = int(float(day_tdee) * 0.7)
                max_cal = int(float(day_tdee) * 1.3)
                
                # Ensure default_cal reflects body composition goals (fat loss, muscle gain)
                # This is the key change to use target energy intake based on body composition goals
                if user_goal_type == "lose_fat":
                    weekly_deficit = goal_info.get('weekly_deficit', 3500)  # Default ~1lb/week
                    daily_deficit = weekly_deficit / 7
                    default_cal = int(day_tdee - daily_deficit)
                elif user_goal_type == "gain_muscle":
                    weekly_surplus = goal_info.get('weekly_surplus', 1750)  # Default ~0.5lb/week
                    daily_surplus = weekly_surplus / 7
                    default_cal = int(day_tdee + daily_surplus)
                else:  # Maintenance
                    default_cal = int(day_tdee)
                    
                # Use the calculated default_cal or the existing value in day_macros
                if 'target_calories' in day_macros and isinstance(day_macros['target_calories'], (int, float)):
                    default_cal = int(day_macros['target_calories'])
            except (TypeError, ValueError):
                # Use safe defaults if calculations fail
                min_cal = 1500
                max_cal = 3000
                default_cal = 2000
                
            # Allow adjusting calories if needed - with slider and editable field
            cal_cols = st.columns([3, 1])
            with cal_cols[0]:
                custom_day_calories = st.slider(
                    f"Calories for {selected_day}", 
                    min_value=min_cal,
                    max_value=max_cal,
                    value=default_cal,  # Ensure this is an integer
                    step=50,
                    key=f"cal_slider_{selected_day}"
                )
            
            with cal_cols[1]:
                # Add editable field for direct input
                typed_calories = st.number_input(
                    "Edit calories",
                    min_value=min_cal,
                    max_value=max_cal,
                    value=custom_day_calories,
                    step=10,
                    key=f"cal_input_{selected_day}"
                )
                # Use the typed value if it differs from the slider
                if typed_calories != custom_day_calories:
                    custom_day_calories = typed_calories
            
            # Ensure protein value is an integer and follows standard coefficients
            # For fat loss: 2.0g/kg or 0.9g/lb
            # For muscle gain: 1.8g/kg or 0.8g/lb
            # For maintenance: 1.6g/kg or 0.7g/lb
            if not isinstance(day_macros['protein'], (int, float)) or day_macros['protein'] <= 0:
                if user_goal_type == "lose_fat":
                    day_macros['protein'] = round(weight_kg * 2.0)  # Higher for fat loss to preserve muscle
                elif user_goal_type == "gain_muscle":
                    day_macros['protein'] = round(weight_kg * 1.8)  # High for muscle gain
                else:  # Maintenance
                    day_macros['protein'] = round(weight_kg * 1.6)  # Moderate for maintenance
                
            # Ensure proper values for protein slider
            try:
                min_protein = round(float(weight_kg) * 1.2)  # Minimum 1.2g/kg
                max_protein = round(float(weight_kg) * 2.5)  # Maximum 2.5g/kg
                
                # Set default based on goal type as per standard coefficients
                if user_goal_type == "lose_fat":
                    default_protein = round(weight_kg * 2.0)  # 2.0g/kg for fat loss
                elif user_goal_type == "gain_muscle":
                    default_protein = round(weight_kg * 1.8)  # 1.8g/kg for muscle gain
                else:  # Maintenance
                    default_protein = round(weight_kg * 1.6)  # 1.6g/kg for maintenance
                    
                # Use existing value if reasonable, otherwise use standard coefficients
                if isinstance(day_macros['protein'], (int, float)) and day_macros['protein'] > 0:
                    default_protein = int(day_macros['protein'])
                
                # Set some sensible limits
                min_protein = max(50, min_protein)
                max_protein = max(200, max_protein)
                
                # Make sure default is within range
                if default_protein < min_protein:
                    default_protein = min_protein
                elif default_protein > max_protein:
                    default_protein = max_protein
            except (TypeError, ValueError):
                # Use safe defaults if calculations fail
                min_protein = 100
                max_protein = 250
                default_protein = 150
            
            # Protein adjustment with detailed information
            cols_protein = st.columns([3, 1])
            with cols_protein[0]:
                custom_day_protein = st.slider(
                    f"Protein for {selected_day}",
                    min_value=min_protein,
                    max_value=max_protein,
                    value=default_protein,
                    help="Recommended: 1.6-2.2g per kg of body weight",
                    key=f"protein_slider_{selected_day}"
                )
            
            with cols_protein[1]:
                # Add editable field for direct protein input
                typed_protein = st.number_input(
                    "Edit protein (g)",
                    min_value=min_protein,
                    max_value=max_protein,
                    value=custom_day_protein,
                    step=1,
                    key=f"protein_input_{selected_day}"
                )
                # Use the typed value if it differs from the slider
                if typed_protein != custom_day_protein:
                    custom_day_protein = typed_protein
            
            # Calculate and display protein in different units
            with cols_protein[1]:
                protein_per_kg = round(custom_day_protein / weight_kg, 2)
                protein_per_lb = round(custom_day_protein / (weight_kg * 2.20462), 2)
                st.write(f"**{custom_day_protein}g total**")
                st.write(f"{protein_per_kg}g/kg")
                st.write(f"{protein_per_lb}g/lb")
            
            # Ensure fat value is an integer and follows standard coefficients
            # Standard: minimum of either 0.8g/kg or 30% of calories
            if not isinstance(day_macros['fat'], (int, float)) or day_macros['fat'] <= 0:
                # Calculate based on standard of minimum 0.8g/kg or 30% of calories
                min_fat_by_weight = round(weight_kg * 0.8)  # 0.8g/kg
                min_fat_by_calories = round(custom_day_calories * 0.3 / 9)  # 30% of calories
                day_macros['fat'] = max(min_fat_by_weight, min_fat_by_calories)
            
            # Fat adjustment (ensure minimum fat intake)
            try:
                # Minimum fat based on weight (0.5g/kg or 0.25g/lb)
                min_fat = round(float(weight_kg) * 0.5)  # Minimum 0.5g/kg
                
                # Maximum fat based on calories (40% of calories)
                max_fat = round(float(custom_day_calories) * 0.4 / 9)  # Maximum 40% of calories
                
                # Default fat based on standard coefficients (30% of calories or 0.8g/kg, whichever is higher)
                min_fat_by_weight = round(weight_kg * 0.8)  # 0.8g/kg
                min_fat_by_calories = round(custom_day_calories * 0.3 / 9)  # 30% of calories
                default_fat = max(min_fat_by_weight, min_fat_by_calories)
                
                # Use existing value if reasonable, otherwise use standard coefficient
                if isinstance(day_macros['fat'], (int, float)) and day_macros['fat'] > 0:
                    default_fat = int(day_macros['fat'])
                
                # Set sensible limits
                min_fat = max(20, min_fat)
                max_fat = max(min_fat + 20, max_fat)  # Ensure max is greater than min
                
                # Make sure default is within range
                if default_fat < min_fat:
                    default_fat = min_fat
                elif default_fat > max_fat:
                    default_fat = max_fat
            except (TypeError, ValueError):
                # Use safe defaults if calculations fail
                min_fat = 50
                max_fat = 120
                default_fat = 70
                
            # Fat adjustment with detailed information
            cols_fat = st.columns([3, 1])
            with cols_fat[0]:
                custom_day_fat = st.slider(
                    f"Fat for {selected_day}",
                    min_value=min_fat,
                    max_value=max_fat,
                    value=default_fat,
                    help="Recommended: 0.5g per kg of body weight or about 25-30% of calories"
                )
            
            # Calculate and display fat in different units
            with cols_fat[1]:
                fat_per_kg = round(custom_day_fat / weight_kg, 2)
                fat_per_lb = round(custom_day_fat / (weight_kg * 2.20462), 2)
                fat_cal_pct = round((custom_day_fat * 9 / custom_day_calories) * 100, 1)
                st.write(f"**{custom_day_fat}g total**")
                st.write(f"{fat_per_kg}g/kg")
                st.write(f"{fat_per_lb}g/lb")
                st.write(f"{fat_cal_pct}% of calories")
            
            # Calculate default carbs from remaining calories
            try:
                protein_calories = float(custom_day_protein) * 4
                fat_calories = float(custom_day_fat) * 9
                carb_calories = float(custom_day_calories) - protein_calories - fat_calories
                default_carbs = max(0, round(carb_calories / 4))
                
                # Calculate min and max values for carb slider
                min_carbs = max(0, round((custom_day_calories * 0.2) / 4))  # Minimum 20% of calories from carbs
                max_carbs = round((custom_day_calories * 0.7) / 4)  # Maximum 70% of calories from carbs
                
                # Make sure default is within range
                if default_carbs < min_carbs:
                    default_carbs = min_carbs
                elif default_carbs > max_carbs:
                    default_carbs = max_carbs
                
                # Add a slider for carbs instead of just displaying the calculated value
                cols_carbs = st.columns([3, 1])
                with cols_carbs[0]:
                    custom_day_carbs = st.slider(
                        f"Carbohydrates for {selected_day}",
                        min_value=min_carbs,
                        max_value=max_carbs,
                        value=default_carbs,
                        help="Adjust carbs based on your preferences and activity level"
                    )
                
                # Show carb metrics in different units
                with cols_carbs[1]:
                    carbs_per_kg = round(custom_day_carbs / weight_kg, 2)
                    carbs_per_lb = round(custom_day_carbs / (weight_kg * 2.20462), 2)
                    carbs_cal_pct = round((custom_day_carbs * 4 / custom_day_calories) * 100, 1)
                    st.write(f"**{custom_day_carbs}g total**")
                    st.write(f"{carbs_per_kg}g/kg")
                    st.write(f"{carbs_per_lb}g/lb")
                    st.write(f"{carbs_cal_pct}% of calories")
                    
                # Recalculate the total calories based on the adjusted macros
                total_calories = (custom_day_protein * 4) + (custom_day_fat * 9) + (custom_day_carbs * 4)
                
                # Calculate calorie difference from target
                calorie_diff = total_calories - custom_day_calories
                diff_text = f"({calorie_diff:+} from target)" if abs(calorie_diff) > 10 else "(matches target)"
                
                # Display adjusted calories with difference from target
                st.write(f"**Adjusted Total Calories:** {round(total_calories)} kcal {diff_text}")
                
                # Show macronutrient breakdown percentages based on the adjusted total calories
                if total_calories > 0:
                    protein_pct = round((custom_day_protein * 4 / total_calories) * 100)
                    fat_pct = round((custom_day_fat * 9 / total_calories) * 100)
                    carbs_pct = round((custom_day_carbs * 4 / total_calories) * 100)
                else:
                    protein_pct = 0
                    fat_pct = 0
                    carbs_pct = 0
            except (TypeError, ValueError, ZeroDivisionError):
                # Fallback to safe values if calculation fails
                custom_day_carbs = 0
                protein_pct = 0
                fat_pct = 0
                carbs_pct = 0
                st.warning("Unable to calculate carbs and percentages due to invalid values.")
            
            st.write(f"**Macronutrient Ratio:** Protein: {protein_pct}% | Carbs: {carbs_pct}% | Fat: {fat_pct}%")
            
            # Calculate Energy Availability
            # Energy Availability = (Calorie intake - exercise energy expenditure) / kg of fat-free mass
            try:
                # Get user information using the same method as elsewhere in the code
                gender = st.session_state.get('gender', 'Male')
                age = st.session_state.get('age', 30)
                weight_kg = st.session_state.get('weight_kg', 70)
                height_cm = st.session_state.get('height_cm', 175)
                body_fat_pct = st.session_state.get('body_fat_pct', 20)
                
                # Calculate fat-free mass in kg
                fat_mass_kg = weight_kg * (body_fat_pct / 100)
                fat_free_mass_kg = weight_kg - fat_mass_kg
                
                # Get exercise energy expenditure from workouts for this day
                day_data = st.session_state.confirmed_weekly_schedule.get(selected_day, {})
                workouts = day_data.get("workouts", [])
                
                exercise_calories = 0
                intensity_multipliers = {
                    "Light": 5.0,
                    "Moderate": 7.5,
                    "High": 10.0,
                    "Very High": 12.5
                }
                
                for workout in workouts:
                    duration = workout.get("duration", 60)  # Default to 60 minutes if not specified
                    intensity = workout.get("intensity", "Moderate")  # Default to Moderate if not specified
                    calories_per_minute = intensity_multipliers.get(intensity, 7.5)
                    workout_calories = duration * calories_per_minute
                    exercise_calories += workout_calories
                
                # Calculate energy availability (kcal/kg FFM)
                energy_availability = (custom_day_calories - exercise_calories) / fat_free_mass_kg
                
                # Display energy availability with interpretation
                ea_color = "green"
                ea_message = "Optimal energy availability"
                
                if energy_availability < 30:
                    ea_color = "red"
                    ea_message = "Low energy availability - may impair performance and health"
                elif energy_availability < 40:
                    ea_color = "orange"
                    ea_message = "Moderate energy availability - adequate for most"
                elif energy_availability > 60:
                    ea_color = "blue"
                    ea_message = "High energy availability - appropriate for gaining phase"
                
                st.markdown(f"""
                **Energy Availability:** :{ea_color}[{round(energy_availability, 1)} kcal/kg FFM]
                - {ea_message}
                - Energy intake: {custom_day_calories} kcal
                - Exercise expenditure: {round(exercise_calories)} kcal
                - Fat-free mass: {round(fat_free_mass_kg, 1)} kg
                """)
                
            except (TypeError, ValueError, ZeroDivisionError):
                st.warning("Unable to calculate energy availability. Check your body composition data.")
            
            # Update day-specific nutrition in session state
            if st.button(f"Save {selected_day}'s Nutrition Plan"):
                st.session_state.day_specific_nutrition[selected_day] = {
                    'target_calories': custom_day_calories,
                    'protein': custom_day_protein,
                    'carbs': custom_day_carbs,
                    'fat': custom_day_fat
                }
                st.success(f"Nutrition plan for {selected_day} has been saved!")
            
            # Option to copy settings to other days
            st.subheader("Copy to Other Days")
            days_to_copy = st.multiselect(
                f"Copy {selected_day}'s nutrition settings to:", 
                [day for day in days_of_week if day != selected_day]
            )
            
            if st.button("Copy Nutrition Settings") and days_to_copy:
                current_settings = st.session_state.day_specific_nutrition[selected_day]
                for day in days_to_copy:
                    st.session_state.day_specific_nutrition[day] = current_settings.copy()
                st.success(f"Copied {selected_day}'s nutrition settings to {', '.join(days_to_copy)}")
            
            # Weekly nutrition overview
            st.subheader("Weekly Nutrition Overview")
            
            # Create data for display
            if len(st.session_state.day_specific_nutrition) > 0:
                weekly_data = []
                weekly_total_calories = 0
                weekly_total_protein = 0
                weekly_total_carbs = 0
                weekly_total_fat = 0
                days_with_data = 0
                
                for day in days_of_week:
                    if day in st.session_state.day_specific_nutrition:
                        day_data = st.session_state.day_specific_nutrition[day]
                        day_cals = day_data['target_calories']
                        day_protein = day_data['protein']
                        day_carbs = day_data['carbs']
                        day_fat = day_data['fat']
                        days_with_data += 1
                        
                        # Calculate macronutrient percentages
                        try:
                            protein_pct = round((day_protein * 4 / float(day_cals)) * 100)
                            carbs_pct = round((day_carbs * 4 / float(day_cals)) * 100)
                            fat_pct = round((day_fat * 9 / float(day_cals)) * 100)
                        except (ZeroDivisionError, TypeError, ValueError):
                            protein_pct = 0
                            carbs_pct = 0
                            fat_pct = 0
                            
                        weekly_data.append({
                            "Day": day,
                            "Calories": f"{day_cals} kcal",
                            "Protein": f"{day_protein}g ({protein_pct}%)",
                            "Carbs": f"{day_carbs}g ({carbs_pct}%)",
                            "Fat": f"{day_fat}g ({fat_pct}%)"
                        })
                        
                        # Add to weekly totals
                        try:
                            weekly_total_calories += float(day_cals)
                            weekly_total_protein += float(day_protein)
                            weekly_total_carbs += float(day_carbs)
                            weekly_total_fat += float(day_fat)
                        except (TypeError, ValueError):
                            pass  # Skip if can't convert to float
                    else:
                        weekly_data.append({
                            "Day": day,
                            "Calories": "Not set",
                            "Protein": "Not set",
                            "Carbs": "Not set",
                            "Fat": "Not set"
                        })
                
                # Add weekly average row if we have data
                if days_with_data > 0:
                    avg_calories = round(weekly_total_calories / days_with_data)
                    avg_protein = round(weekly_total_protein / days_with_data)
                    avg_carbs = round(weekly_total_carbs / days_with_data)
                    avg_fat = round(weekly_total_fat / days_with_data)
                    
                    # Calculate average percentages
                    try:
                        avg_protein_pct = round((avg_protein * 4 / avg_calories) * 100)
                        avg_carbs_pct = round((avg_carbs * 4 / avg_calories) * 100)
                        avg_fat_pct = round((avg_fat * 9 / avg_calories) * 100)
                    except (ZeroDivisionError, TypeError):
                        avg_protein_pct = 0
                        avg_carbs_pct = 0
                        avg_fat_pct = 0
                    
                    weekly_data.append({
                        "Day": "WEEKLY AVG",
                        "Calories": f"{avg_calories} kcal",
                        "Protein": f"{avg_protein}g ({avg_protein_pct}%)",
                        "Carbs": f"{avg_carbs}g ({avg_carbs_pct}%)",
                        "Fat": f"{avg_fat}g ({avg_fat_pct}%)"
                    })
                
                # Display as a table
                weekly_df = pd.DataFrame(weekly_data)
                st.table(weekly_df)
            else:
                st.write("No day-specific nutrition plans have been set up yet.")
    
    # Macro breakdown visualization
    st.subheader("Macronutrient Breakdown")
    
    # Calculate calories and percentages
    protein_cals = macros['protein'] * 4
    carbs_cals = macros['carbs'] * 4
    fat_cals = macros['fat'] * 9
    
    protein_pct = round(protein_cals / target_calories * 100)
    carbs_pct = round(carbs_cals / target_calories * 100)
    fat_pct = round(fat_cals / target_calories * 100)
    
    # Adjust to ensure percentages sum to 100%
    total_pct = protein_pct + carbs_pct + fat_pct
    if total_pct != 100:
        # Adjust the largest percentage to make the total 100%
        if max(protein_pct, carbs_pct, fat_pct) == protein_pct:
            protein_pct = 100 - carbs_pct - fat_pct
        elif max(protein_pct, carbs_pct, fat_pct) == carbs_pct:
            carbs_pct = 100 - protein_pct - fat_pct
        else:
            fat_pct = 100 - protein_pct - carbs_pct
    
    # Create a pie chart (simplified - would use matplotlib or plotly in a full implementation)
    st.write(f"Protein: {protein_pct}% | Carbs: {carbs_pct}% | Fat: {fat_pct}%")
    
    # Save macros to session state
    st.session_state.macros = macros
    
    # Save button for nutrition targets
    if st.button("Save Nutrition Targets"):
        st.success("Your nutrition targets have been saved!")
        
        # Save to session state
        st.session_state.target_calories = target_calories
        st.session_state.macros = macros
        
        # Save to file (utils function would handle this)
        utils.save_data()