import streamlit as st
import pandas as pd
import numpy as np
from datetime import datetime
import sys
import os
from datetime import datetime

# Add the root directory to the path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import utils

# Set page title and layout
st.set_page_config(
    page_title="Fitomics - Initial Setup",
    page_icon="💪",
    layout="wide"
)

# Attempt to load existing data
utils.load_data()

st.title("Initial Setup")
st.markdown("Let's get started by collecting some basic information about you.")

# Form for user information
with st.form("user_info_form"):
    st.subheader("Personal Information")
    
    # First column
    col1, col2 = st.columns(2)
    
    with col1:
        gender = st.radio(
            "Select Gender",
            options=["Male", "Female"],
            index=0 if st.session_state.user_info.get('gender') == "Male" else 1 if st.session_state.user_info.get('gender') == "Female" else 0
        )
        
        dob = st.date_input(
            "Enter Date of Birth (MM/DD/YYYY)",
            value=datetime.now().date().replace(year=datetime.now().year - 30) if not st.session_state.user_info.get('dob') else 
                  datetime.strptime(st.session_state.user_info.get('dob'), '%Y-%m-%d').date()
        )
        
        # Calculate age from DOB
        today = datetime.now().date()
        age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
        
        # Height in inches
        height_inches = st.number_input(
            "Enter Height (Inches)",
            min_value=36,
            max_value=96,
            value=int(st.session_state.user_info.get('height_cm', 170) / 2.54) if st.session_state.user_info.get('height_cm') else 67,
            step=1
        )
        
        # Convert to cm for calculations
        height_cm = height_inches * 2.54
        
        # Weight in pounds
        weight_lbs = st.number_input(
            "Enter Weight (Pounds)",
            min_value=66.0,
            max_value=660.0,
            value=st.session_state.user_info.get('weight_kg', 70.0) * 2.20462 if st.session_state.user_info.get('weight_kg') else 154.0,
            step=0.1,
            format="%.1f"
        )
        
        # Convert to kg for calculations
        weight_kg = weight_lbs / 2.20462
    
    with col2:
        body_fat = st.number_input(
            "Enter Current Estimated Body Fat %",
            min_value=3.0,
            max_value=50.0,
            value=st.session_state.user_info.get('body_fat_percentage', 15.0),
            step=0.1,
            format="%.1f"
        )
        
        # Define activity level options
        activity_options = [
            "Sedentary (0-5k steps/day)",
            "Light Active (5-10k steps/day)",
            "Active (10-15k steps/day)",
            "Labor Intensive (>15k steps/day)"
        ]
        
        # Determine the selected index, handling legacy activity level values
        current_activity = st.session_state.user_info.get('activity_level')
        if current_activity is None:
            selected_index = 0
        elif current_activity in activity_options:
            selected_index = activity_options.index(current_activity)
        else:
            # Handle legacy activity levels by mapping them to new options
            legacy_mapping = {
                "Sedentary (office job, <2 hours exercise per week)": 0,
                "Lightly Active (light exercise 2-3 times per week)": 1, 
                "Moderately Active (moderate exercise 3-5 times per week)": 2,
                "Very Active (hard exercise 6-7 times per week)": 3,
                "Extremely Active (very hard exercise, physical job or training twice a day)": 3
            }
            selected_index = legacy_mapping.get(current_activity, 0)
        
        activity_level = st.selectbox(
            "Select Physical Activity Level Outside of Workouts",
            options=activity_options,
            index=selected_index
        )
        
        workouts_per_week = st.number_input(
            "Enter Average Number of Workouts Per Week",
            min_value=0,
            max_value=14,
            value=st.session_state.user_info.get('workouts_per_week', 3),
            step=1
        )
        
        workout_calories = st.number_input(
            "Enter Average Calories Expended During a Workout",
            min_value=0,
            max_value=2000,
            value=st.session_state.user_info.get('workout_calories', 300),
            step=50
        )

    # Additional questions for goals and preferences
    st.subheader("Goals and Preferences")
    
    goal_type = st.radio(
        "What body composition goal do you want to focus on over the next 8-12 weeks?",
        options=["Lose fat", "Build muscle"],
        index=0 if st.session_state.user_info.get('goal_focus') == "Lose fat" else 
              1 if st.session_state.user_info.get('goal_focus') == "Build muscle" else 0
    )
    
    performance_preference = st.radio(
        "Regarding your performance and recovery, choose one of the following options:",
        options=[
            "I'm ok if my performance and recovery from training aren't as good during this phase in order to achieve my body composition goal.",
            "I want to maximally support my performance and recovery from training as this matters more to me than my body composition goal."
        ],
        index=0 if st.session_state.user_info.get('performance_preference') == "I'm ok if my performance and recovery from training aren't as good during this phase in order to achieve my body composition goal." else 
              1 if st.session_state.user_info.get('performance_preference') == "I want to maximally support my performance and recovery from training as this matters more to me than my body composition goal." else 0
    )
    
    body_comp_preference_options = []
    if goal_type == "Lose fat":
        body_comp_preference_options = [
            "I don't want to lose any muscle mass while losing body fat.",
            "I'm ok with losing a little muscle mass while losing body fat."
        ]
    else:  # Build muscle
        body_comp_preference_options = [
            "I'm ok with gaining a little body fat to maximize muscle growth.",
            "I do not want to gain any body fat while targeting muscle gain."
        ]
    
    body_comp_preference = st.radio(
        "Regarding your body composition, choose one of the following options:",
        options=body_comp_preference_options,
        index=0 if st.session_state.user_info.get('body_comp_preference') in body_comp_preference_options else 0
    )
    
    commitment_level = st.radio(
        "As of today, choose what you believe you can commit to:",
        options=[
            "I am committed to prioritizing adequate sleep, performing resistance exercise/cardio at least 4 days per week, consuming adequate protein, macronutrients, and micronutrients this phase. I'm also willing to track my nutrition and bodyweight consistently.",
            "I can commit to at least a few workouts per week and will try to ensure I prioritize sufficient sleep. I will also try to eat mindfully according to my goals, but I'm not certain I'll be able to do all that's required to maximize my progress during this phase.",
            "I can't commit to consistently perform 3 or more workouts per week or achieve adequate sleep levels. I'm also not willing to regularly track my nutrition and bodyweight."
        ],
        index=0 if st.session_state.user_info.get('commitment_level') == "I am committed to prioritizing adequate sleep, performing resistance exercise/cardio at least 4 days per week, consuming adequate protein, macronutrients, and micronutrients this phase. I'm also willing to track my nutrition and bodyweight consistently." else 
              1 if st.session_state.user_info.get('commitment_level') == "I can commit to at least a few workouts per week and will try to ensure I prioritize sufficient sleep. I will also try to eat mindfully according to my goals, but I'm not certain I'll be able to do all that's required to maximize my progress during this phase." else 
              2 if st.session_state.user_info.get('commitment_level') == "I can't commit to consistently perform 3 or more workouts per week or achieve adequate sleep levels. I'm also not willing to regularly track my nutrition and bodyweight." else 0
    )
    
    submit_button = st.form_submit_button("Save and Continue")
    
    if submit_button:
        # Map activity level to TDEE multiplier format
        activity_map = {
            "Sedentary (0-5k steps/day)": "Sedentary (office job, <2 hours exercise per week)",
            "Light Active (5-10k steps/day)": "Lightly Active (light exercise 2-3 times per week)",
            "Active (10-15k steps/day)": "Moderately Active (moderate exercise 3-5 times per week)",
            "Labor Intensive (>15k steps/day)": "Very Active (hard exercise 6-7 times per week)"
        }
        
        mapped_activity = activity_map[activity_level]
        
        # Map goal type to internal code
        goal_type_code = "lose_fat" if goal_type == "Lose fat" else "gain_muscle"
        
        # Update session state with all the new fields
        st.session_state.user_info = {
            'gender': gender,
            'dob': dob.strftime('%Y-%m-%d'),
            'age': age,
            'height_cm': height_cm,
            'height_inches': height_inches,
            'weight_kg': weight_kg,
            'weight_lbs': weight_lbs,
            'body_fat_percentage': body_fat,
            'activity_level': mapped_activity,  # Use mapped activity for TDEE calculation
            'raw_activity_level': activity_level,  # Store original selection
            'workouts_per_week': workouts_per_week,
            'workout_calories': workout_calories,
            'goal_focus': goal_type,
            'performance_preference': performance_preference,
            'body_comp_preference': body_comp_preference,
            'commitment_level': commitment_level
        }
        
        # Set the goal type in goal_info as well since it's now collected in initial setup
        if 'goal_info' not in st.session_state:
            st.session_state.goal_info = {}
        
        st.session_state.goal_info['goal_type'] = goal_type_code
        
        # Save data
        utils.save_data()
        
        st.success("Personal information saved! Please proceed to 'Body Composition Goals'.")
        
        # Calculate some stats for user information
        # We need to use the mapped activity level for TDEE calculation
        tdee = utils.calculate_tdee(gender, weight_kg, height_cm, age, mapped_activity)
        
        # Add workout calories to TDEE
        total_workout_calories = workouts_per_week * workout_calories / 7  # Average per day
        adjusted_tdee = tdee + total_workout_calories
        
        bmr = utils.calculate_bmr(gender, weight_kg, height_cm, age)
        
        st.info(f"""
        Based on your information:
        - Basal Metabolic Rate (BMR): {bmr:.0f} calories/day
        - Total Daily Energy Expenditure (TDEE): {tdee:.0f} calories/day
        - With workout calories: {adjusted_tdee:.0f} calories/day
        
        These are the calories you need to maintain your current weight. We'll use this information to customize your plan based on your goals.
        """)

# Show navigation hint
st.markdown("---")
st.markdown("👈 Use the sidebar to navigate between pages")
st.markdown("👉 Next step: [Body Composition Goals](/Body_Composition_Goals)")
