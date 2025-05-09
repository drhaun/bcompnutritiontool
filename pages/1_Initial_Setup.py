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
    page_icon="🛡️",
    layout="wide"
)

# Attempt to load existing data
utils.load_data()

# Load brand logo
st.markdown("""
<div class="logo-container">
    <img src="data:image/png;base64,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" height="60">
    <h1 class="title-text">Initial Setup</h1>
</div>
""", unsafe_allow_html=True)

st.markdown("Let's get started by collecting some basic information about you.")

# Initialize unit toggle in session state if it doesn't exist
if 'use_imperial' not in st.session_state:
    st.session_state.use_imperial = True  # Default to imperial units (US/pounds)

# Unit toggle (outside the form so it updates immediately)
units_col1, units_col2 = st.columns([1, 3])
with units_col1:
    imperial_selected = st.toggle("Use Imperial Units", value=st.session_state.use_imperial)
    st.session_state.use_imperial = imperial_selected

with units_col2:
    if imperial_selected:
        st.info("Using pounds, inches, etc. (US/Imperial units)")
    else:
        st.info("Using kilograms, centimeters, etc. (Metric units)")

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
        
        # Height in inches or cm based on the unit toggle
        if imperial_selected:
            height_inches = st.number_input(
                "Enter Height (inches)",
                min_value=36,
                max_value=96,
                value=int(st.session_state.user_info.get('height_cm', 170) / 2.54) if st.session_state.user_info.get('height_cm') else 67,
                step=1
            )
            # Convert to cm for calculations
            height_cm = height_inches * 2.54
        else:
            height_cm = st.number_input(
                "Enter Height (cm)",
                min_value=91.0,
                max_value=244.0,
                value=st.session_state.user_info.get('height_cm', 170.0),
                step=1.0,
                format="%.1f"
            )
            # Set inches for storage
            height_inches = height_cm / 2.54
        
        # Weight in pounds or kg based on the unit toggle
        if imperial_selected:
            weight_lbs = st.number_input(
                "Enter Weight (pounds)",
                min_value=66.0,
                max_value=660.0,
                value=st.session_state.user_info.get('weight_kg', 70.0) * 2.20462 if st.session_state.user_info.get('weight_kg') else 154.0,
                step=0.1,
                format="%.1f"
            )
            # Convert to kg for calculations
            weight_kg = weight_lbs / 2.20462
        else:
            weight_kg = st.number_input(
                "Enter Weight (kg)",
                min_value=30.0,
                max_value=300.0,
                value=st.session_state.user_info.get('weight_kg', 70.0),
                step=0.1,
                format="%.1f"
            )
            # Set pounds for storage
            weight_lbs = weight_kg * 2.20462
    
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
        
        # New categorized workout frequency (for rate calculation)
        workout_freq_options = [
            "0-1 workouts per week",
            "2-3 workouts per week", 
            "4-5 workouts per week",
            "6+ workouts per week"
        ]
        
        # Determine default selection based on numeric input
        if workouts_per_week <= 1:
            default_workout_index = 0
        elif workouts_per_week <= 3:
            default_workout_index = 1
        elif workouts_per_week <= 5:
            default_workout_index = 2
        else:
            default_workout_index = 3
            
        # Get stored value if available
        stored_workout_freq = st.session_state.user_info.get('workout_frequency')
        stored_workout_freq_index = workout_freq_options.index(stored_workout_freq) if stored_workout_freq in workout_freq_options else default_workout_index
        
        workout_frequency = st.selectbox(
            "Workout Frequency Category (for rate calculation)",
            options=workout_freq_options,
            index=stored_workout_freq_index
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
    
    # Body composition goal selection with maintain option added
    goal_type = st.radio(
        "What body composition goal do you want to focus on over the next 8-12 weeks?",
        options=["Lose fat", "Build muscle", "Maintain body composition/Support performance"],
        index=0 if st.session_state.user_info.get('goal_focus') == "Lose fat" else 
              1 if st.session_state.user_info.get('goal_focus') == "Build muscle" else
              2 if st.session_state.user_info.get('goal_focus') == "Maintain body composition/Support performance" else 0
    )
    
    # Show performance preference only if not in maintenance mode
    if goal_type != "Maintain body composition/Support performance":
        performance_preference = st.radio(
            "Regarding your performance and recovery, choose one of the following options:",
            options=[
                "I'm ok if my performance and recovery from training aren't as good during this phase in order to achieve my body composition goal.",
                "I want to maximally support my performance and recovery from training as this matters more to me than my body composition goal."
            ],
            index=0 if st.session_state.user_info.get('performance_preference') == "I'm ok if my performance and recovery from training aren't as good during this phase in order to achieve my body composition goal." else 
                  1 if st.session_state.user_info.get('performance_preference') == "I want to maximally support my performance and recovery from training as this matters more to me than my body composition goal." else 0
        )
    else:
        # Default value for maintenance mode
        performance_preference = "I want to maximally support my performance and recovery from training as this matters more to me than my body composition goal."
    
    # Show body composition preference conditionally
    body_comp_preference_options = []
    if goal_type == "Lose fat":
        body_comp_preference_options = [
            "I don't want to lose any muscle mass while losing body fat.",
            "I'm ok with losing a little muscle mass while losing body fat."
        ]
        
        body_comp_preference = st.radio(
            "Regarding your body composition, choose one of the following options:",
            options=body_comp_preference_options,
            index=0 if st.session_state.user_info.get('body_comp_preference') in body_comp_preference_options else 0
        )
    elif goal_type == "Build muscle":
        body_comp_preference_options = [
            "I'm ok with gaining a little body fat to maximize muscle growth.",
            "I do not want to gain any body fat while targeting muscle gain."
        ]
        
        body_comp_preference = st.radio(
            "Regarding your body composition, choose one of the following options:",
            options=body_comp_preference_options,
            index=0 if st.session_state.user_info.get('body_comp_preference') in body_comp_preference_options else 0
        )
    else:  # Maintenance mode doesn't need body comp preferences
        body_comp_preference = "Maintain current body composition"
    
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
        if goal_type == "Lose fat":
            goal_type_code = "lose_fat"
        elif goal_type == "Build muscle":
            goal_type_code = "gain_muscle"
        else:  # Maintain body composition
            goal_type_code = "maintain"
        
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
            'workout_frequency': workout_frequency,
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
        
        # Store use_imperial setting
        st.session_state.user_info['use_imperial'] = imperial_selected
        
        # Display different messages based on the goal type
        if goal_type_code == "maintain":
            goal_message = "maintain your current weight and body composition while supporting your performance."
        elif goal_type_code == "lose_fat":
            goal_message = "create a caloric deficit to help you lose fat while preserving muscle mass."
        else:  # gain_muscle
            goal_message = "create a slight caloric surplus to help you build muscle while minimizing fat gain."
            
        # Format height and weight based on selected units
        if imperial_selected:
            height_display = f"{int(height_inches//12)}'{int(height_inches%12)}\""
            weight_display = f"{weight_lbs:.1f} lbs"
        else:
            height_display = f"{height_cm:.1f} cm"
            weight_display = f"{weight_kg:.1f} kg"
            
        st.info(f"""
        Based on your information:
        - Height: {height_display}
        - Weight: {weight_display}
        - Body Fat: {body_fat:.1f}%
        - Basal Metabolic Rate (BMR): {bmr:.0f} calories/day
        - Total Daily Energy Expenditure (TDEE): {tdee:.0f} calories/day
        - With workout calories: {adjusted_tdee:.0f} calories/day
        
        These are the calories you need to maintain your current weight. Based on your goal to {goal_message}
        """)

# Show navigation hint
st.markdown("---")
st.markdown("👈 Use the sidebar to navigate between pages")
st.markdown("👉 Next step: [Body Composition Goals](/Body_Composition_Goals)")
