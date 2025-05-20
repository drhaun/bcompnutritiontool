import streamlit as st
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from datetime import datetime, timedelta
import sys
import os

# Add the root directory to the path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import utils

# Define body composition categories with rate recommendations
# FMI categories with rate recommendations
fmi_categories = [
    {"name": "Extremely Lean", "lower": 2, "upper": 3, 
     "gain_rate": 0.0075, "gain_fat_pct": 0.10, "loss_rate": None, "loss_fat_pct": None},
    {"name": "Lean", "lower": 3.1, "upper": 5.2, 
     "gain_rate": 0.0075, "gain_fat_pct": 0.10, "loss_rate": None, "loss_fat_pct": None},
    {"name": "Considered Healthy", "lower": 5.3, "upper": 7.2, 
     "gain_rate": 0.0025, "gain_fat_pct": 0.50, "loss_rate": 0.0050, "loss_fat_pct": 0.80},
    {"name": "Slightly Overfat", "lower": 7.3, "upper": 9.1, 
     "gain_rate": 0.0013, "gain_fat_pct": 0.80, "loss_rate": 0.0075, "loss_fat_pct": 0.80},
    {"name": "Overfat", "lower": 9.2, "upper": 12.9, 
     "gain_rate": None, "gain_fat_pct": None, "loss_rate": 0.0100, "loss_fat_pct": 0.80},
    {"name": "Significantly Overfat", "lower": 13, "upper": 35, 
     "gain_rate": None, "gain_fat_pct": None, "loss_rate": 0.0125, "loss_fat_pct": 0.80}
]

# FFMI categories with rate recommendations
ffmi_categories = [
    {"name": "Undermuscled", "lower": 8, "upper": 16, 
     "gain_rate": 0.0075, "gain_fat_pct": 0.10, "loss_rate": None, "loss_fat_pct": None},
    {"name": "Moderately Undermuscled", "lower": 16.1, "upper": 17.8, 
     "gain_rate": 0.0050, "gain_fat_pct": 0.10, "loss_rate": 0.0, "loss_fat_pct": 0.50},
    {"name": "Considered Healthy", "lower": 17.9, "upper": 22, 
     "gain_rate": 0.0025, "gain_fat_pct": 0.50, "loss_rate": 0.01, "loss_fat_pct": 0.80},
    {"name": "Muscular", "lower": 22.1, "upper": 25, 
     "gain_rate": 0.0025, "gain_fat_pct": 0.50, "loss_rate": 0.01, "loss_fat_pct": 0.80},
    {"name": "High", "lower": 25.1, "upper": 35, 
     "gain_rate": 0.0025, "gain_fat_pct": 0.50, "loss_rate": 0.01, "loss_fat_pct": 0.80}
]

# Set page title and layout
st.set_page_config(
    page_title="Fitomics - Body Composition Goals",
    page_icon="💪",
    layout="wide"
)

# Attempt to load existing data
utils.load_data()

# Check if user has completed the initial setup
if not st.session_state.user_info['gender']:
    st.warning("Please complete the Initial Setup first!")
    st.stop()

st.title("Body Composition Goals")
st.markdown("Define your body composition targets and timeline.")

# Form for goal setting
with st.form("goal_setting_form"):
    st.subheader("Set Your Goals")
    
    # Current weight and body fat from user info
    current_weight_kg = st.session_state.user_info['weight_kg']
    current_weight_lbs = st.session_state.user_info.get('weight_lbs', current_weight_kg * 2.20462)
    current_bf = st.session_state.user_info['body_fat_percentage']
    
    st.info(f"Current Weight: {current_weight_lbs:.1f} lbs ({current_weight_kg:.1f} kg) | Current Body Fat: {current_bf}%")
    
    # Get goal type from Initial Setup if available, otherwise offer selection
    initial_goal_focus = st.session_state.user_info.get('goal_focus')
    
    # If goal_type exists in goal_info, use that, otherwise use goal_focus from user_info
    stored_goal_type = st.session_state.goal_info.get('goal_type')
    
    if stored_goal_type:
        # Map internal code to display name
        if stored_goal_type == "lose_fat":
            initial_goal_index = 0  # "Lose fat"
        elif stored_goal_type == "gain_muscle":
            initial_goal_index = 1  # "Build muscle" / "Gain muscle"
        else:
            initial_goal_index = 2  # "Maintain current composition"
    elif initial_goal_focus:
        if initial_goal_focus == "Lose fat":
            initial_goal_index = 0
        elif initial_goal_focus == "Build muscle":
            initial_goal_index = 1
        else:
            initial_goal_index = 2
    else:
        initial_goal_index = 0  # Default to "Lose fat"
    
    col1, col2 = st.columns(2)
    
    with col1:
        # Use the goal from the user info instead of asking again
        if "goal_focus" in st.session_state.user_info:
            goal_type = st.session_state.user_info["goal_focus"]
            # Handle maintain body composition format difference
            if goal_type == "Maintain body composition/Support performance":
                goal_type = "Maintain current composition"
            
            st.write(f"**Your Primary Goal**: {goal_type}")
        else:
            # Fallback in case goal wasn't set in Initial Setup
            goal_type = "Lose fat"
            st.write(f"**Your Primary Goal**: {goal_type}")
            st.write("(You can change this in the Initial Setup page)")
        
        # Convert the display name to the internal code
        goal_type_code = "lose_fat" if goal_type == "Lose fat" else "gain_muscle" if goal_type in ["Gain muscle", "Build muscle"] else "maintain"
        
        # Default target weight based on goal type (in pounds)
        default_target_weight_lbs = 0
        if goal_type == "Lose fat":
            default_target_weight_lbs = current_weight_lbs * 0.9
        elif goal_type == "Gain muscle":
            default_target_weight_lbs = current_weight_lbs * 1.05
        else:  # maintain
            default_target_weight_lbs = current_weight_lbs
        
        # Display appropriate guidance based on goal type
        if goal_type == "Lose fat":
            # Calculate current fat mass
            current_fat_mass_kg = current_weight_kg * (current_bf/100)
            current_fat_mass_lbs = current_fat_mass_kg * 2.20462
            current_fat_free_mass_kg = current_weight_kg - current_fat_mass_kg
            current_fat_free_mass_lbs = current_fat_free_mass_kg * 2.20462
            
            st.info("""
            **Fat Loss Guidelines:**
            - A healthy fat loss rate is generally 0.5-1% of body weight per week
            - It is recommended to target no more than 2 lbs of fat loss per week
            - Maximum suggested target is 25 lbs of fat mass loss in an 8-12 week period
            - Slower rates (0.25-0.5% per week) are better for preserving muscle and performance
            """)
            
            # Weight loss rate tables
            st.write("#### Weight Loss Rate Reference")
            
            weight_loss_rate_df = pd.DataFrame({
                'Percentage of Weight Loss Per Week': ['0.25%', '0.50%', '0.75%', '1.00%', '1.25%'],
                'Description': [
                    'Slowest suggested rate of loss with intent to minimize performance and recovery decrements and loss of muscle mass.',
                    'A moderate rate of loss with intent to minimize performance and recovery decrements and loss of muscle mass.',
                    'A fast rate of loss with a higher risk of performance and recovery impairment and loss of muscle mass.',
                    'This is an aggressive rate of loss with performance and recovery impairments more probable.',
                    'This is a very aggressive rate of loss with a higher probability of impairments in performance, recovery, mood, and loss of muscle mass.'
                ]
            })
            
            st.table(weight_loss_rate_df)
            
            # Weight loss composition table
            st.write("#### Weight Loss Composition Reference")
            
            weight_loss_comp_df = pd.DataFrame({
                'Percentage of Weight Loss as Fat Tissue': ['50-70%', '70-80%', '80-100%'],
                'Description': [
                    'Low commitment, low physical activity, low protein intake, inadequate sleep, inconsistent tracking, inconsistent exercise',
                    'Moderate commitment, light physical activity, moderate protein intake, more regular tracking, regular adequate sleep, 3-5 workouts per week',
                    'High commitment, high physical activity, adequate protein intake, consistent adequate sleep, consistent tracking, >5 workouts per week'
                ]
            })
            
            st.table(weight_loss_comp_df)
            
            # Direct target fat mass input
            st.write("#### Set Target Fat Mass")
            target_fat_mass_lbs = st.number_input(
                "Target Fat Mass (lbs)", 
                min_value=max(current_fat_mass_lbs - 25, 5.0),  # Cap max loss at 25 lbs
                max_value=current_fat_mass_lbs - 0.5,  # Must be at least 0.5 lb less
                value=max(current_fat_mass_lbs * 0.85, current_fat_mass_lbs - 10),
                step=0.5,
                help="Enter your target fat mass in pounds (must be lower than current fat mass)"
            )
            
            # Convert to kg
            target_fat_mass_kg = target_fat_mass_lbs / 2.20462
            
            # Assume preservation of lean body mass for fat loss
            target_ffm_lbs = st.number_input(
                "Target Fat-Free Mass (lbs)",
                min_value=current_fat_free_mass_lbs * 0.95,  # Allow slight loss
                max_value=current_fat_free_mass_lbs * 1.05,  # Allow slight gain
                value=current_fat_free_mass_lbs,
                step=0.5,
                help="Enter your target fat-free mass (usually similar to current for fat loss)"
            )
            
            # Convert to kg
            target_ffm_kg = target_ffm_lbs / 2.20462
            
            # Calculate resulting total weight and body fat
            target_weight_kg = target_fat_mass_kg + target_ffm_kg
            target_weight_lbs = target_weight_kg * 2.20462
            target_bf = (target_fat_mass_kg / target_weight_kg) * 100
            
            st.success(f"Calculated Target Weight: {target_weight_lbs:.1f} lbs | Target Body Fat: {target_bf:.1f}%")
            
        elif goal_type == "Gain muscle":
            # Calculate current fat mass
            current_fat_mass_kg = current_weight_kg * (current_bf/100)
            current_fat_mass_lbs = current_fat_mass_kg * 2.20462
            current_fat_free_mass_kg = current_weight_kg - current_fat_mass_kg
            current_fat_free_mass_lbs = current_fat_free_mass_kg * 2.20462
            
            st.info("""
            **Muscle Gain Guidelines:**
            - A realistic muscle gain rate is generally 0.25-0.5% of body weight per week
            - It is recommended to target no more than 1 lb of muscle gain per week
            - Maximum suggested target is 10 lbs of muscle mass gain in an 8-12 week period
            - Faster rates typically result in more fat gain alongside muscle
            """)
            
            # Weight gain rate tables
            st.write("#### Weight Gain Rate Reference")
            
            weight_gain_rate_df = pd.DataFrame({
                'Percentage of Weight Gain Per Week': ['0.13%', '0.25%', '0.50%', '0.75%'],
                'Description': [
                    'Slowest suggested rate of weight gain per week with the intent to aggressively minimize body fat gain but support muscle growth conservatively.',
                    'Moderate rate of weight gain per week to support gains in muscle mass in an effort to minimize body fat gain.',
                    'Aggressive rate of weight gain per week in an effort to maximize muscle growth without as much concern for gaining some body fat for a period of time.',
                    'Very aggressive rate of weight gain per week to gain muscle mass with a higher probability of gaining a measurable amount of body fat for a period of time.'
                ]
            })
            
            st.table(weight_gain_rate_df)
            
            # Weight gain composition table
            st.write("#### Weight Gain Composition Reference")
            
            weight_gain_comp_df = pd.DataFrame({
                'Percentage of Weight Gain as Fat Tissue': ['5-30%', '30-70%', '>70%'],
                'Description': [
                    'High commitment, high physical activity, adequate protein intake, consistent adequate sleep, consistent tracking, >5 workouts per week',
                    'Moderate commitment, light physical activity, moderate protein intake, more regular tracking, regular adequate sleep, 3-5 workouts per week',
                    'Low commitment, low physical activity, low protein intake, inadequate sleep, inconsistent tracking, inconsistent exercise'
                ]
            })
            
            st.table(weight_gain_comp_df)
            
            # Direct target fat-free mass input 
            st.write("#### Set Target Fat-Free Mass")
            target_ffm_lbs = st.number_input(
                "Target Fat-Free Mass (lbs)",
                min_value=current_fat_free_mass_lbs + 0.5,  # Must be at least 0.5 lb more
                max_value=min(current_fat_free_mass_lbs + 10, current_fat_free_mass_lbs * 1.1),  # Cap at 10 lbs gain
                value=min(current_fat_free_mass_lbs * 1.05, current_fat_free_mass_lbs + 5),
                step=0.5,
                help="Enter your target fat-free mass (must be higher than current fat-free mass)"
            )
            
            # Convert to kg
            target_ffm_kg = target_ffm_lbs / 2.20462
            
            # Allow slight change in fat mass for muscle gain (usually increases)
            target_fat_mass_lbs = st.number_input(
                "Target Fat Mass (lbs)",
                min_value=max(current_fat_mass_lbs * 0.9, 5.0),
                max_value=current_fat_mass_lbs * 1.2,
                value=current_fat_mass_lbs,
                step=0.5,
                help="Enter your target fat mass (may increase slightly during bulking)"
            )
            
            # Convert to kg
            target_fat_mass_kg = target_fat_mass_lbs / 2.20462
            
            # Calculate resulting total weight and body fat
            target_weight_kg = target_fat_mass_kg + target_ffm_kg
            target_weight_lbs = target_weight_kg * 2.20462
            target_bf = (target_fat_mass_kg / target_weight_kg) * 100
            
            st.success(f"Calculated Target Weight: {target_weight_lbs:.1f} lbs | Target Body Fat: {target_bf:.1f}%")
            
        else:  # Maintain
            # Convert stored target weight to pounds if it exists
            stored_target_weight_kg = st.session_state.goal_info.get('target_weight_kg')
            stored_target_weight_lbs = stored_target_weight_kg * 2.20462 if stored_target_weight_kg else default_target_weight_lbs
            
            target_weight_lbs = st.number_input(
                "Target Weight (lbs)",
                min_value=66.0,
                max_value=660.0,
                value=stored_target_weight_lbs,
                step=0.5,
                format="%.1f"
            )
            
            # Convert to kg for backend calculations
            target_weight_kg = target_weight_lbs / 2.20462
            
            target_bf = st.number_input(
                "Target Body Fat (%)",
                min_value=3.0,
                max_value=50.0,
                value=st.session_state.goal_info.get('target_body_fat', current_bf),
                step=0.1,
                format="%.1f"
            )
        
        # Make sure all values are of the same type (float)
        timeline_weeks = st.number_input(
            "Timeline (weeks)",
            min_value=4.0,
            max_value=52.0,
            value=float(st.session_state.goal_info.get('timeline_weeks', 12)),
            step=1.0
        )
        
        # Handle the start date, ensuring type safety
        default_start_date = datetime.now().date()
        
        # Get the stored start date if available
        stored_start_date = st.session_state.goal_info.get('start_date')
        
        if stored_start_date:
            try:
                # Try to convert it to a date if it's a string
                if isinstance(stored_start_date, str):
                    parsed_date = datetime.strptime(stored_start_date, '%Y-%m-%d').date()
                else:
                    # If it's not a string (maybe a float from a previous error), use default
                    parsed_date = default_start_date
            except (ValueError, TypeError):
                parsed_date = default_start_date
        else:
            parsed_date = default_start_date
            
        start_date = st.date_input(
            "Start Date",
            value=parsed_date
        )
    
    submit_button = st.form_submit_button("Save and Continue")
    
    if submit_button:
        # Calculate expected weekly change
        weight_change_kg = target_weight_kg - current_weight_kg
        weight_change_lbs = target_weight_lbs - current_weight_lbs
        weekly_change_kg = weight_change_kg / timeline_weeks
        weekly_change_lbs = weight_change_lbs / timeline_weeks
        weekly_bf_change = (target_bf - current_bf) / timeline_weeks
        
        # Validate goal feasibility
        is_goal_feasible = True
        warning_message = ""
        
        if goal_type == "Lose fat" and weekly_change_kg > -0.1:
            warning_message = "For fat loss, aim to lose at least 0.2 lbs (0.1 kg) per week."
            is_goal_feasible = False
        elif goal_type == "Lose fat" and weekly_change_kg < -1.0:
            warning_message = "Weight loss faster than 2.2 lbs (1 kg) per week is not recommended for most people."
            is_goal_feasible = False
        elif goal_type == "Gain muscle" and weekly_change_kg < 0.1:
            warning_message = "For muscle gain, aim to gain at least 0.2 lbs (0.1 kg) per week."
            is_goal_feasible = False
        elif goal_type == "Gain muscle" and weekly_change_kg > 0.5:
            warning_message = "Weight gain faster than 1.1 lbs (0.5 kg) per week may lead to excessive fat gain."
            is_goal_feasible = False
        
        if not is_goal_feasible:
            st.warning(warning_message)
        else:
            # Update session state
            st.session_state.goal_info = {
                'goal_type': goal_type_code,
                'target_weight_kg': target_weight_kg,
                'target_weight_lbs': target_weight_lbs,
                'target_body_fat': target_bf,
                'timeline_weeks': timeline_weeks,
                'start_date': start_date.strftime('%Y-%m-%d')
            }
            
            # Calculate end date
            end_date = start_date + timedelta(days=timeline_weeks * 7)
            
            # Save data
            utils.save_data()
            
            st.success("Goals saved! Please proceed to 'Nutrition Plan'.")
            
            st.info(f"""
            Goal Summary:
            - Goal Type: {goal_type}
            - Weight Change: {weight_change_lbs:.1f} lbs ({weight_change_kg:.1f} kg) ({weekly_change_lbs:.1f} lbs/week)
            - Body Fat Change: {target_bf - current_bf:.1f}% ({weekly_bf_change:.2f}%/week)
            - Timeline: {timeline_weeks} weeks (from {start_date} to {end_date})
            """)

# Display expected progress if goals have been set
if st.session_state.goal_info.get('target_weight_kg'):
    st.subheader("Current Body Composition Analysis")
    
    # Calculate values with safety checks
    current_weight_kg = st.session_state.user_info['weight_kg']
    target_weight_kg = st.session_state.goal_info['target_weight_kg']
    current_weight_lbs = current_weight_kg * 2.20462
    target_weight_lbs = target_weight_kg * 2.20462
    current_bf = st.session_state.user_info['body_fat_percentage']
    target_bf = st.session_state.goal_info['target_body_fat']
    
    # Add a default value for timeline_weeks if it's missing or NaN
    timeline_weeks = st.session_state.goal_info.get('timeline_weeks', 12)
    if pd.isna(timeline_weeks):
        timeline_weeks = 12.0
    
    height_cm = st.session_state.user_info['height_cm']
    height_m = height_cm / 100
    
    # Calculate current fat mass and fat-free mass
    current_fat_mass_kg = current_weight_kg * (current_bf/100)
    current_fat_free_mass_kg = current_weight_kg - current_fat_mass_kg
    
    # Calculate indices
    fat_mass_index = current_fat_mass_kg / (height_m * height_m)
    fat_free_mass_index = current_fat_free_mass_kg / (height_m * height_m)
    
    # Find the user's FMI and FFMI categories for rate recommendations
    user_fmi_category = None
    fmi_category_name = "Unknown"
    for category in fmi_categories:
        if category["lower"] <= fat_mass_index <= category["upper"]:
            user_fmi_category = category
            fmi_category_name = category["name"]
            break
            
    user_ffmi_category = None
    ffmi_category_name = "Unknown"
    for category in ffmi_categories:
        if category["lower"] <= fat_free_mass_index <= category["upper"]:
            user_ffmi_category = category
            ffmi_category_name = category["name"]
            break
    
    # Convert from display types to calculation types for goal
    if goal_type == "Gain muscle":
        goal_type_for_calc = "Muscle Gain"
    elif goal_type == "Lose fat":
        goal_type_for_calc = "Fat Loss"
    else:  # Maintain body composition
        goal_type_for_calc = "Maintain"
    
    # Prepare user data for rate calculation
    user_data = {
        "fmi_category": user_fmi_category,
        "ffmi_category": user_ffmi_category,
        "performance_preference": st.session_state.user_info.get('performance_preference', ""),
        "body_comp_preference": st.session_state.user_info.get('body_comp_preference', ""),
        "commitment_level": st.session_state.user_info.get('commitment_level', ""),
        "workout_frequency": st.session_state.user_info.get('workout_frequency', "")
    }
    
    # Get recommended weekly change rates
    recommended_rates = utils.calculate_recommended_rate(user_data, goal_type_for_calc)
    
    # Calculate recommended weekly changes
    recommended_weight_pct = recommended_rates["weekly_weight_pct"]
    recommended_fat_pct = recommended_rates["weekly_fat_pct"] 
    recommended_muscle_pct = recommended_rates["weekly_muscle_pct"]
    
    # Weekly percent of body weight change
    if goal_type == "Lose fat":
        # For fat loss, negative percentage
        recommended_weekly_kg = -1 * current_weight_kg * recommended_weight_pct
        recommended_weekly_fat_kg = recommended_weekly_kg * recommended_fat_pct
        recommended_weekly_muscle_kg = recommended_weekly_kg * recommended_muscle_pct
    else:
        # For muscle gain, positive percentage  
        recommended_weekly_kg = current_weight_kg * recommended_weight_pct
        recommended_weekly_fat_kg = recommended_weekly_kg * recommended_fat_pct
        recommended_weekly_muscle_kg = recommended_weekly_kg * recommended_muscle_pct
    
    # Convert to pounds
    recommended_weekly_lbs = recommended_weekly_kg * 2.20462
    recommended_weekly_fat_lbs = recommended_weekly_fat_kg * 2.20462
    recommended_weekly_muscle_lbs = recommended_weekly_muscle_kg * 2.20462
    
    # Calculate what this means for total timeline
    recommended_total_weight_kg = recommended_weekly_kg * timeline_weeks
    recommended_total_weight_lbs = recommended_weekly_lbs * timeline_weeks
    
    # Calculate recommended target based on current + recommended change
    recommended_target_weight_kg = current_weight_kg + recommended_total_weight_kg
    recommended_target_weight_lbs = current_weight_lbs + recommended_total_weight_lbs
    
    # Calculate body fat change based on muscle/fat ratio
    total_fat_change_kg = recommended_weekly_fat_kg * timeline_weeks
    total_muscle_change_kg = recommended_weekly_muscle_kg * timeline_weeks
    
    # Calculate new body composition
    rec_fat_mass_kg = current_fat_mass_kg + total_fat_change_kg
    rec_muscle_mass_kg = current_weight_kg * (1 - current_bf/100) + total_muscle_change_kg
    rec_total_weight_kg = rec_fat_mass_kg + rec_muscle_mass_kg
    rec_body_fat_pct = (rec_fat_mass_kg / rec_total_weight_kg) * 100
    
    # Display recommendation
    st.subheader("Recommended Rate of Change")
    
    # Get the recommendation category from the calculation
    recommended_category = recommended_rates.get("recommendation", "Maintain")
    
    # Display the overall recommendation
    if recommended_category != "No Indication" and recommended_category != "Maintain":
        st.success(f"Your body composition suggests you should: **{recommended_category}**")
    else:
        st.info("Based on your body composition, you have multiple viable options. Choose based on your personal preferences.")
    
    col1, col2 = st.columns(2)
    with col1:
        if goal_type == "Maintain body composition":
            st.info(f"Recommended approach: **Maintain current weight** with focus on performance")
            st.write("- Focus on eating at maintenance calories")
            st.write("- Prioritize protein intake for recovery")
            st.write("- Match carbs and fats to training needs")
        else:
            direction = "loss" if goal_type == "Lose fat" else "gain"
            st.info(f"Recommended weekly weight {direction}: **{abs(recommended_weekly_lbs):.2f} lbs** ({abs(recommended_weekly_kg):.2f} kg)")
            
            if goal_type == "Lose fat":
                st.write(f"- Fat loss per week: **{abs(recommended_weekly_fat_lbs):.2f} lbs** ({100*recommended_fat_pct:.0f}% of weight loss)")
                st.write(f"- Muscle loss per week: **{abs(recommended_weekly_muscle_lbs):.2f} lbs** ({100*recommended_muscle_pct:.0f}% of weight loss)")
            else:
                st.write(f"- Muscle gain per week: **{abs(recommended_weekly_muscle_lbs):.2f} lbs** ({100*recommended_muscle_pct:.0f}% of weight gain)")
                st.write(f"- Fat gain per week: **{abs(recommended_weekly_fat_lbs):.2f} lbs** ({100*recommended_fat_pct:.0f}% of weight gain)")
            
    with col2:
        if goal_type == "Maintain body composition":
            st.info(f"Focus on performance metrics instead of body weight changes")
            st.write("- Track strength improvements")
            st.write("- Monitor recovery quality")
            st.write("- Adjust nutrition based on performance, not scale weight")
        else:
            st.info(f"Recommended {timeline_weeks}-week target: **{rec_total_weight_kg*2.20462:.1f} lbs at {rec_body_fat_pct:.1f}% body fat**")
        
        # Calculate percent of goal for weight loss/gain only
        if goal_type != "Maintain body composition":
            goal_magnitude = abs(current_weight_kg - target_weight_kg)
            rec_magnitude = abs(recommended_total_weight_kg)
            
            # Only show percentage if there's an actual goal magnitude
            if goal_magnitude > 0.1:
                pct_of_goal = min(100, (rec_magnitude / goal_magnitude) * 100)
                st.write(f"This is approximately **{pct_of_goal:.0f}%** of your selected goal.")
            
            st.write(f"This rate is customized based on your combined FMI/FFMI categories, performance preferences, and commitment level.")
        
    # Add explanation about the combined FMI/FFMI approach
    with st.expander("About Rate Calculation System"):
        st.write("""
        The recommended rate is calculated using a sophisticated weighted system that considers:
        
        1. **Combined Body Composition Assessment (40% weight)**: Your FMI category ('{0}') and FFMI category ('{1}') 
           together form the baseline recommended rate.
        
        2. **Workout Frequency (25% weight)**: Higher workout frequency significantly improves nutrient partitioning,
           allowing for faster rates with better body composition outcomes.
           
        3. **Activity Level (15% weight)**: General activity level outside of structured workouts influences 
           your body's response to caloric changes.
        
        4. **Performance vs Body Composition Preferences (10% weight)**: Your preferences for performance recovery vs. 
           pure body composition influence the aggressiveness of recommendations.
           
        5. **Commitment Level (10% weight)**: Higher commitment to tracking, consistency, nutrition, and sleep
           enables more aggressive but sustainable recommendations.
           
        The system calculates the fat/muscle breakdown slightly differently:
        - Workout frequency (30% weight) has the largest impact on how much fat vs. muscle you gain or lose
        - Your starting body composition (30% weight) sets the baseline
        - Commitment level (20% weight) influences nutrient partitioning through consistency
        - Other factors (20% weight) provide fine-tuning
        
        This approach provides truly personalized recommendations based on the latest research in body recomposition
        and accounts for your unique starting point and specific lifestyle factors.
        """.format(fmi_category_name, ffmi_category_name))
        
        # Create a visual table showing the combination categories
        st.subheader("Combined FMI/FFMI Recommendation Matrix")
        st.write("This table shows the general recommendations based on different combinations of fat mass and muscle mass:")
        
        # Create data for the combined recommendations table
        fmi_categories_short = ["Extremely Lean", "Lean", "Considered Healthy", "Slightly Overfat", "Overfat", "Significantly Overfat"]
        ffmi_categories_short = ["Undermuscled", "Moderately Undermuscled", "Considered Healthy", "Muscular", "High"]
        
        # Create DataFrame for the visualization
        matrix_data = []
        for fmi in fmi_categories_short:
            row_data = {'FMI': fmi}
            for ffmi in ffmi_categories_short:
                combo_rec = utils.get_combined_category_rates(fmi, ffmi)
                recommendation = combo_rec.get("recommendation", "")
                row_data[ffmi] = recommendation
            matrix_data.append(row_data)
        
        recommendation_matrix = pd.DataFrame(matrix_data)
        recommendation_matrix = recommendation_matrix.set_index('FMI')
        
        # Display the matrix
        st.table(recommendation_matrix)
        
        # Highlight user's current position
        st.write(f"**Your current position**: FMI: **{fmi_category_name}**, FFMI: **{ffmi_category_name}**")
        st.write(f"**Recommendation**: {recommended_category}")
        
        # Create a second table showing the rate recommendations
        st.subheader("Rate Recommendations by FMI/FFMI Combination")
        st.write("Percent of bodyweight per week:")
        
        # Create data for gain rates
        gain_matrix_data = []
        for fmi in fmi_categories_short:
            row_data = {'FMI': fmi}
            for ffmi in ffmi_categories_short:
                combo_rec = utils.get_combined_category_rates(fmi, ffmi)
                gain_rate = combo_rec.get("gain_rate", 0) * 100  # Convert to percentage
                row_data[ffmi] = f"{gain_rate:.2f}%" if gain_rate > 0 else "-"
            gain_matrix_data.append(row_data)
        
        gain_matrix = pd.DataFrame(gain_matrix_data)
        gain_matrix = gain_matrix.set_index('FMI')
        
        # Create data for loss rates
        loss_matrix_data = []
        for fmi in fmi_categories_short:
            row_data = {'FMI': fmi}
            for ffmi in ffmi_categories_short:
                combo_rec = utils.get_combined_category_rates(fmi, ffmi)
                loss_rate = combo_rec.get("loss_rate", 0) * 100  # Convert to percentage
                row_data[ffmi] = f"{loss_rate:.2f}%" if loss_rate > 0 else "-"
            loss_matrix_data.append(row_data)
        
        loss_matrix = pd.DataFrame(loss_matrix_data)
        loss_matrix = loss_matrix.set_index('FMI')
        
        # Display the rates side by side
        col1, col2 = st.columns(2)
        
        with col1:
            st.write("**Gain Rates (% of body weight/week)**")
            st.table(gain_matrix)
            
        with col2:
            st.write("**Loss Rates (% of body weight/week)**")
            st.table(loss_matrix)
        
    st.markdown("---")
        
    # Calculate weekly changes based on user's input (not recommendation)
    weekly_weight_change_kg = (target_weight_kg - current_weight_kg) / timeline_weeks
    weekly_weight_change_lbs = (target_weight_lbs - current_weight_lbs) / timeline_weeks
    weekly_bf_change = (target_bf - current_bf) / timeline_weeks
    
    # Calculate lean body mass changes
    current_lbm_kg = current_weight_kg * (1 - current_bf/100)
    target_lbm_kg = target_weight_kg * (1 - target_bf/100)
    lbm_change_kg = target_lbm_kg - current_lbm_kg
    
    # Convert to pounds for display
    current_fat_mass_lbs = current_fat_mass_kg * 2.20462
    current_fat_free_mass_lbs = current_fat_free_mass_kg * 2.20462
    
    # Note: Indices have already been calculated earlier
    
    # Display current composition table
    st.subheader("Current Body Composition Breakdown")
    
    comp_df = pd.DataFrame({
        'Measurement': ['Current Weight', 'Current Fat Mass', 'Current Fat-Free Mass'],
        'Kilograms': [f"{current_weight_kg:.1f} kg", f"{current_fat_mass_kg:.1f} kg", f"{current_fat_free_mass_kg:.1f} kg"],
        'Pounds': [f"{current_weight_lbs:.1f} lbs", f"{current_fat_mass_lbs:.1f} lbs", f"{current_fat_free_mass_lbs:.1f} lbs"],
        'Percentage': ["100%", f"{current_bf:.1f}%", f"{100-current_bf:.1f}%"]
    })
    
    st.table(comp_df)
    
    # Display the indices side by side
    col1, col2 = st.columns(2)
    
    with col1:
        st.subheader("Fat Mass Index (FMI)")
        st.metric("Your FMI", f"{fat_mass_index:.1f} kg/m²")
        
        # Use the FMI categories defined at the top of the file
        
        # Find user's category - using the already defined fmi_category_name
        user_fmi_category = fmi_category_name
        
        st.success(f"Category: **{user_fmi_category}**")
        
        # Display all categories
        st.write("**Fat Mass Index Categories:**")
        for category in fmi_categories:
            if user_fmi_category == category["name"]:
                st.markdown(f"- **{category['name']}**: {category['lower']} - {category['upper']} kg/m² ← **You are here**")
            else:
                st.markdown(f"- {category['name']}: {category['lower']} - {category['upper']} kg/m²")
    
    with col2:
        st.subheader("Fat-Free Mass Index (FFMI)")
        st.metric("Your FFMI", f"{fat_free_mass_index:.1f} kg/m²")
        
        # Use the FFMI categories defined at the top of the file
        
        # Find user's category - using the already defined ffmi_category_name
        user_ffmi_category = ffmi_category_name
        
        st.success(f"Category: **{user_ffmi_category}**")
        
        # Display all categories
        st.write("**Fat-Free Mass Index Categories:**")
        for category in ffmi_categories:
            if user_ffmi_category == category["name"]:
                st.markdown(f"- **{category['name']}**: {category['lower']} - {category['upper']} kg/m² ← **You are here**")
            else:
                st.markdown(f"- {category['name']}: {category['lower']} - {category['upper']} kg/m²")
    
    # Calculate fat mass ranges for each FMI category based on user's height
    st.subheader("Body Composition Reference Tables")
    st.write("These tables show the fat mass and fat-free mass ranges for each category based on your height.")
    
    # Create fat mass ranges table
    fmi_ranges = []
    for category in fmi_categories:
        min_fat_mass_kg = category["lower"] * (height_m * height_m)
        max_fat_mass_kg = category["upper"] * (height_m * height_m)
        min_fat_mass_lbs = min_fat_mass_kg * 2.20462
        max_fat_mass_lbs = max_fat_mass_kg * 2.20462
        
        if user_fmi_category == category["name"]:
            fmi_ranges.append({
                'Category': f"**{category['name']}** ← **Current**",
                'Fat Mass Range (kg)': f"**{min_fat_mass_kg:.1f} - {max_fat_mass_kg:.1f} kg**",
                'Fat Mass Range (lbs)': f"**{min_fat_mass_lbs:.1f} - {max_fat_mass_lbs:.1f} lbs**"
            })
        else:
            fmi_ranges.append({
                'Category': category['name'],
                'Fat Mass Range (kg)': f"{min_fat_mass_kg:.1f} - {max_fat_mass_kg:.1f} kg",
                'Fat Mass Range (lbs)': f"{min_fat_mass_lbs:.1f} - {max_fat_mass_lbs:.1f} lbs"
            })
    
    # Calculate fat-free mass ranges for each FFMI category based on user's height
    ffmi_ranges = []
    for category in ffmi_categories:
        min_ffm_kg = category["lower"] * (height_m * height_m)
        max_ffm_kg = category["upper"] * (height_m * height_m)
        min_ffm_lbs = min_ffm_kg * 2.20462
        max_ffm_lbs = max_ffm_kg * 2.20462
        
        if user_ffmi_category == category["name"]:
            ffmi_ranges.append({
                'Category': f"**{category['name']}** ← **Current**",
                'Fat-Free Mass Range (kg)': f"**{min_ffm_kg:.1f} - {max_ffm_kg:.1f} kg**",
                'Fat-Free Mass Range (lbs)': f"**{min_ffm_lbs:.1f} - {max_ffm_lbs:.1f} lbs**"
            })
        else:
            ffmi_ranges.append({
                'Category': category['name'],
                'Fat-Free Mass Range (kg)': f"{min_ffm_kg:.1f} - {max_ffm_kg:.1f} kg",
                'Fat-Free Mass Range (lbs)': f"{min_ffm_lbs:.1f} - {max_ffm_lbs:.1f} lbs"
            })
    
    # Display the tables side by side
    col1, col2 = st.columns(2)
    
    with col1:
        st.subheader("Fat Mass Ranges for Your Height")
        st.table(pd.DataFrame(fmi_ranges))
    
    with col2:
        st.subheader("Fat-Free Mass Ranges for Your Height")
        st.table(pd.DataFrame(ffmi_ranges))
    
    st.subheader("Expected Progress")
    
    # Generate detailed weekly progress table
    goal_type_code = st.session_state.goal_info.get('goal_type', 'lose_fat')
    tdee = st.session_state.user_info.get('tdee', 2000)
    gender = st.session_state.user_info.get('gender', 'Male')
    age = st.session_state.user_info.get('age', 30)
    height_cm = st.session_state.user_info.get('height_cm', 170)
    
    # Calculate weekly percentage changes
    weekly_weight_pct = abs(weekly_weight_change_kg / current_weight_kg)
    
    # Determine fat percentage based on goal type
    if goal_type_code == "lose_fat":
        weekly_fat_pct = 0.8  # 80% of weight loss is fat by default
    else:
        weekly_fat_pct = 0.2  # 20% of weight gain is fat by default
    
    # Create start date
    start_date_str = st.session_state.goal_info.get('start_date', datetime.now().strftime('%Y-%m-%d'))
    
    # Generate the detailed weekly projection table
    detailed_progress_df = utils.generate_detailed_progress_table(
        current_weight_lbs,
        current_bf,
        target_weight_lbs,
        target_bf,
        weekly_weight_pct,
        weekly_fat_pct,
        timeline_weeks,
        start_date_str,
        tdee,
        gender,
        age,
        height_cm
    )
    
    # Check if the detailed progress table was generated successfully
    if detailed_progress_df.empty:
        st.error("Unable to generate detailed progress table. Please check your inputs and try again.")
        # Create a simple progress table as a fallback
        weeks = []
        week = 0
        while week <= timeline_weeks:
            weeks.append(week)
            week += 4
        
        # Make sure the final week is included if it's not already
        if timeline_weeks not in weeks:
            weeks.append(timeline_weeks)
        
        progress_data = []
        for week in weeks:
            expected_weight_kg = current_weight_kg + (weekly_weight_change_kg * week)
            expected_weight_lbs = expected_weight_kg * 2.20462
            expected_bf = current_bf + (weekly_bf_change * week)
            expected_lbm_kg = expected_weight_kg * (1 - expected_bf/100)
            expected_lbm_lbs = expected_lbm_kg * 2.20462
            expected_fat_mass_kg = expected_weight_kg * (expected_bf/100)
            expected_fat_mass_lbs = expected_fat_mass_kg * 2.20462
            
            progress_data.append({
                'Week': week,
                'Weight (lbs)': f"{expected_weight_lbs:.1f}",
                'Body Fat (%)': f"{expected_bf:.1f}",
                'Lean Mass (lbs)': f"{expected_lbm_lbs:.1f}",
                'Fat Mass (lbs)': f"{expected_fat_mass_lbs:.1f}"
            })
        
        summary_df = pd.DataFrame(progress_data)
        st.table(summary_df)
        st.stop()  # Stop execution to prevent errors with visualizations
    
    # Create simplified table for display if we have data
    summary_weeks = []
    week = 0
    while week <= timeline_weeks:
        summary_weeks.append(week)
        week += 4
    
    # Make sure the final week is included if it's not already
    if timeline_weeks not in summary_weeks:
        summary_weeks.append(timeline_weeks)
    
    # Create simpler summary table for display
    summary_data = []
    for week in summary_weeks:
        week_data = {}
        if week == 0:
            # Use starting values for week 0
            week_data = {
                'Week': 0,
                'Weight (lbs)': f"{current_weight_lbs:.1f}",
                'Body Fat (%)': f"{current_bf:.1f}",
                'Lean Mass (lbs)': f"{current_weight_lbs * (1 - current_bf/100):.1f}",
                'Fat Mass (lbs)': f"{current_weight_lbs * (current_bf/100):.1f}"
            }
        else:
            # Find the closest week in the detailed data
            closest_week = min(detailed_progress_df['Week'].tolist(), key=lambda x: abs(x - week))
            week_row = detailed_progress_df[detailed_progress_df['Week'] == closest_week]
            
            if not week_row.empty:
                row = week_row.iloc[0]
                week_data = {
                    'Week': week,
                    'Weight (lbs)': f"{float(row['Ending Weight (lbs)']):.1f}",
                    'Body Fat (%)': f"{float(row['Ending Body Fat %']):.1f}",
                    'Lean Mass (lbs)': f"{float(row['Ending FFM (lbs)']):.1f}",
                    'Fat Mass (lbs)': f"{float(row['Ending Fat Mass (lbs)']):.1f}"
                }
        
        summary_data.append(week_data)
    
    summary_df = pd.DataFrame(summary_data)
    
    # Display the summary table
    st.table(summary_df)
    
    # Create visualizations for the expected progress
    st.subheader("Visualized Progress")
    
    # Create progress visualization for weight and body composition
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 6))
    
    # Weight progress chart
    weeks_list = detailed_progress_df['Week'].tolist()
    weight_list = detailed_progress_df['Ending Weight (lbs)'].tolist()
    
    # Add the starting point (week 0)
    weeks_list = [0] + weeks_list
    weight_list = [current_weight_lbs] + weight_list
    
    ax1.plot(weeks_list, weight_list, marker='o', linewidth=2, color='#007BFF')
    ax1.set_title(f'Weight Progress Over {timeline_weeks} Weeks', fontsize=14)
    ax1.set_xlabel('Week', fontsize=12)
    ax1.set_ylabel('Weight (lbs)', fontsize=12)
    ax1.grid(True, linestyle='--', alpha=0.7)
    
    # Highlight starting and ending points
    ax1.plot(0, current_weight_lbs, 'go', markersize=10, label='Start')
    ax1.plot(timeline_weeks, target_weight_lbs, 'ro', markersize=10, label='Goal')
    ax1.legend()
    
    # Add annotations
    ax1.annotate(f"{current_weight_lbs:.1f} lbs", (0, current_weight_lbs), 
                 textcoords="offset points", xytext=(0,10), ha='center')
    ax1.annotate(f"{target_weight_lbs:.1f} lbs", (timeline_weeks, target_weight_lbs), 
                 textcoords="offset points", xytext=(0,10), ha='center')
    
    # Body composition progress chart
    fat_mass_list = detailed_progress_df['Ending Fat Mass (lbs)'].tolist()
    ffm_list = detailed_progress_df['Ending FFM (lbs)'].tolist()
    
    # Add the starting point (week 0)
    fat_mass_list = [current_weight_lbs * (current_bf/100)] + fat_mass_list
    ffm_list = [current_weight_lbs * (1 - current_bf/100)] + ffm_list
    
    # Create a stacked bar chart for body composition
    # Select weeks to display (0, 1/4, 1/2, 3/4, and final)
    display_indices = [0]
    for i in range(1, 4):
        index = int(len(weeks_list) * (i/4))
        if index not in display_indices and index < len(weeks_list):
            display_indices.append(index)
    if len(weeks_list) - 1 not in display_indices:
        display_indices.append(len(weeks_list) - 1)
    
    display_weeks = [weeks_list[i] for i in display_indices]
    display_fat = [fat_mass_list[i] for i in display_indices]
    display_ffm = [ffm_list[i] for i in display_indices]
    
    bar_width = 0.6
    ax2.bar(display_weeks, display_fat, bar_width, label='Fat Mass', color='#FFA500')
    ax2.bar(display_weeks, display_ffm, bar_width, bottom=display_fat, label='Fat-Free Mass', color='#28A745')
    
    # Add body fat percentages on top of each bar
    for i, week in enumerate(display_weeks):
        total_height = display_fat[i] + display_ffm[i]
        bf_pct = (display_fat[i] / total_height) * 100 if total_height > 0 else 0
        ax2.text(week, total_height + 2, f"{bf_pct:.1f}%", ha='center', va='bottom')
    
    ax2.set_title('Body Composition Changes', fontsize=14)
    ax2.set_xlabel('Week', fontsize=12)
    ax2.set_ylabel('Weight (lbs)', fontsize=12)
    ax2.legend(loc='upper center')
    ax2.grid(True, linestyle='--', alpha=0.7)
    
    plt.tight_layout()
    st.pyplot(fig)
    
    # Create visualizations for the nutritional aspects
    fig2, (ax3, ax4) = plt.subplots(1, 2, figsize=(14, 6))
    
    # Energy balance chart
    energy_balance = detailed_progress_df['Daily Energy Balance (kcal)'].tolist()
    tdee_list = detailed_progress_df['Daily TDEE (kcal)'].tolist()
    energy_target = detailed_progress_df['Daily Energy Target (kcal)'].tolist()
    
    # Add starting values
    energy_balance = [energy_balance[0]] + energy_balance
    tdee_list = [tdee_list[0]] + tdee_list
    energy_target = [energy_target[0]] + energy_target
    
    ax3.plot(weeks_list, tdee_list, marker='o', linewidth=2, label='TDEE', color='#17a2b8')
    ax3.plot(weeks_list, energy_target, marker='s', linewidth=2, label='Target Calories', color='#28A745')
    ax3.axhline(y=0, color='gray', linestyle='-', alpha=0.3)
    
    # Color the energy balance differently based on surplus or deficit
    for i in range(len(weeks_list)-1):
        color = '#FFA500' if energy_balance[i] > 0 else '#007BFF'
        ax3.plot([weeks_list[i], weeks_list[i+1]], 
                 [energy_balance[i], energy_balance[i+1]], 
                 marker='o', linewidth=2, color=color)
    
    ax3.set_title('Energy Balance Over Time', fontsize=14)
    ax3.set_xlabel('Week', fontsize=12)
    ax3.set_ylabel('Calories (kcal)', fontsize=12)
    ax3.legend()
    ax3.grid(True, linestyle='--', alpha=0.7)
    
    # Energy availability chart
    energy_availability = detailed_progress_df['Energy Availability (kcal/kg FFM)'].tolist()
    energy_availability = [energy_availability[0]] + energy_availability
    
    ax4.plot(weeks_list, energy_availability, marker='o', linewidth=2, color='#6f42c1')
    ax4.axhline(y=30, color='red', linestyle='--', alpha=0.7, label='Min. Recommended')
    ax4.axhline(y=45, color='green', linestyle='--', alpha=0.7, label='Optimal Range')
    
    ax4.set_title('Energy Availability (kcal/kg of FFM)', fontsize=14)
    ax4.set_xlabel('Week', fontsize=12)
    ax4.set_ylabel('Energy Availability', fontsize=12)
    ax4.legend()
    ax4.grid(True, linestyle='--', alpha=0.7)
    
    plt.tight_layout()
    st.pyplot(fig2)
    
    # Display detailed progress table with an expandable section
    with st.expander("View Detailed Weekly Progress Table"):
        st.dataframe(detailed_progress_df)
    
    # Display some insights about the goal
    st.subheader("Goal Insights")
    
    lbm_change_lbs = lbm_change_kg * 2.20462
    
    if lbm_change_kg > 0:
        st.success(f"Your plan aims to build approximately {lbm_change_lbs:.1f} lbs ({lbm_change_kg:.1f} kg) of lean body mass.")
    elif lbm_change_kg < 0:
        st.warning(f"Your plan will result in approximately {abs(lbm_change_lbs):.1f} lbs ({abs(lbm_change_kg):.1f} kg) loss of lean body mass. Consider increasing protein intake and resistance training to minimize muscle loss.")
    
    fat_mass_change_kg = (target_weight_kg * target_bf/100) - (current_weight_kg * current_bf/100)
    fat_mass_change_lbs = fat_mass_change_kg * 2.20462
    
    if fat_mass_change_kg < 0:
        st.success(f"Your plan aims to lose approximately {abs(fat_mass_change_lbs):.1f} lbs ({abs(fat_mass_change_kg):.1f} kg) of fat mass.")
    elif fat_mass_change_kg > 0:
        st.warning(f"Your plan will result in approximately {fat_mass_change_lbs:.1f} lbs ({fat_mass_change_kg:.1f} kg) gain of fat mass. If this is not intended, consider adjusting your goals.")
    
    # Calculate target indices
    target_fat_mass_kg = target_weight_kg * (target_bf/100)
    target_fat_free_mass_kg = target_weight_kg - target_fat_mass_kg
    
    target_fmi = target_fat_mass_kg / (height_m * height_m)
    target_ffmi = target_fat_free_mass_kg / (height_m * height_m)
    
    # Display body composition index changes
    st.subheader("Body Composition Index Changes")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.write("**Fat Mass Index (FMI)**")
        fmi_delta = target_fmi - fat_mass_index
        st.metric(
            label="Current → Target", 
            value=f"{fat_mass_index:.1f} → {target_fmi:.1f} kg/m²",
            delta=f"{fmi_delta:.1f} kg/m²",
            delta_color="inverse"  # Inverse because lower FMI is usually better
        )
        
        # Find target FMI category
        target_fmi_category = "Unknown"
        for category in fmi_categories:
            if category["lower"] <= target_fmi <= category["upper"]:
                target_fmi_category = category["name"]
                break
                
        st.write(f"Target Category: **{target_fmi_category}**")
    
    with col2:
        st.write("**Fat-Free Mass Index (FFMI)**")
        ffmi_delta = target_ffmi - fat_free_mass_index
        st.metric(
            label="Current → Target", 
            value=f"{fat_free_mass_index:.1f} → {target_ffmi:.1f} kg/m²",
            delta=f"{ffmi_delta:.1f} kg/m²",
            delta_color="normal"  # Normal because higher FFMI is usually better
        )
        
        # Find target FFMI category
        target_ffmi_category = "Unknown"
        for category in ffmi_categories:
            if category["lower"] <= target_ffmi <= category["upper"]:
                target_ffmi_category = category["name"]
                break
                
        st.write(f"Target Category: **{target_ffmi_category}**")

    # Display user preferences from Initial Setup
    body_comp_preference = st.session_state.user_info.get('body_comp_preference')
    performance_preference = st.session_state.user_info.get('performance_preference')
    commitment_level = st.session_state.user_info.get('commitment_level')
    
    if body_comp_preference and performance_preference and commitment_level:
        st.subheader("Your Goal Preferences")
        
        st.write(f"**Body Composition Preference:** {body_comp_preference}")
        st.write(f"**Performance & Recovery Priority:** {performance_preference}")
        
        commitment_level_map = {
            "I am committed to prioritizing adequate sleep, performing resistance exercise/cardio at least 4 days per week, consuming adequate protein, macronutrients, and micronutrients this phase. I'm also willing to track my nutrition and bodyweight consistently.": "High",
            "I can commit to at least a few workouts per week and will try to ensure I prioritize sufficient sleep. I will also try to eat mindfully according to my goals, but I'm not certain I'll be able to do all that's required to maximize my progress during this phase.": "Medium",
            "I can't commit to consistently perform 3 or more workouts per week or achieve adequate sleep levels. I'm also not willing to regularly track my nutrition and bodyweight.": "Low"
        }
        
        commitment_level_display = commitment_level_map.get(commitment_level, "Medium")
        st.write(f"**Commitment Level:** {commitment_level_display}")
        
        # Add some personalized recommendations based on commitment level
        st.subheader("Personalized Recommendations")
        
        if commitment_level_display == "High":
            st.write("""
            Based on your high commitment level:
            - Track daily calorie and macronutrient intake using the Daily Monitoring page
            - Weigh yourself consistently (same time, same conditions) 3-7 times per week
            - Adjust your nutrition plan weekly based on the recommendations in the Progress Dashboard
            - Maintain a regular resistance training program at least 4 days per week
            - Prioritize 7-9 hours of quality sleep each night
            """)
        elif commitment_level_display == "Medium":
            st.write("""
            Based on your medium commitment level:
            - Track your nutrition at least 4 days per week, including weekends
            - Weigh yourself at least twice weekly (same conditions) to monitor trends
            - Try to maintain 2-3 resistance training sessions weekly
            - Focus on protein intake and overall calorie targets as your main priorities
            - Aim for 7+ hours of sleep when possible
            """)
        else:  # Low
            st.write("""
            Based on your lower commitment level:
            - Focus on simple habits that don't require constant tracking
            - Weigh yourself once a week to keep awareness of trends
            - Prioritize protein intake at each meal (aim for a portion the size of your palm)
            - Try to include some form of resistance exercise when possible
            - Set realistic expectations for progress given your current constraints
            """)

    # Generate detailed weekly progress projection table
    st.markdown("---")
    st.subheader("Detailed Weekly Progress Projection")
    
    # Use the actual rate based on target and timeline, not the recommended rate
    # This ensures the weekly projection matches the user's chosen targets
    weight_change_kg = target_weight_kg - current_weight_kg
    weekly_weight_change_kg = weight_change_kg / timeline_weeks
    
    # For percentage calculations, we need the sign to be correct
    if goal_type == "Lose fat":
        weekly_weight_pct = weekly_weight_change_kg / current_weight_kg  # Will be negative for weight loss
        weekly_fat_pct = recommended_fat_pct  # Use the recommended fat percentage for loss
    else:  # Gain muscle
        weekly_weight_pct = weekly_weight_change_kg / current_weight_kg  # Will be positive for weight gain
        weekly_fat_pct = recommended_fat_pct  # Use the recommended fat percentage for gain
    
    # Get other parameters needed for the calculation
    start_date_str = st.session_state.goal_info.get('start_date')
    gender = st.session_state.user_info.get('gender')
    age = st.session_state.user_info.get('age')
    
    # Calculate TDEE
    activity_level = st.session_state.user_info.get('activity_level', "Sedentary (office job, <2 hours exercise per week)")
    tdee = utils.calculate_tdee(gender, current_weight_kg, height_cm, age, activity_level)
    
    # Generate the detailed progress table
    progress_table = utils.generate_detailed_progress_table(
        current_weight_lbs, 
        current_bf, 
        target_weight_lbs, 
        target_bf, 
        weekly_weight_pct, 
        weekly_fat_pct, 
        int(timeline_weeks), 
        start_date_str, 
        tdee, 
        gender, 
        age, 
        height_cm
    )
    
    if not progress_table.empty:
        # Create a tab view for different representations of the data
        tab1, tab2, tab3 = st.tabs(["Full Table", "Summary View", "Visualization"])
        
        with tab1:
            # Display the full detailed table
            st.dataframe(progress_table)
            
            # Add download button for CSV
            csv = progress_table.to_csv(index=False)
            st.download_button(
                label="Download Progress Table as CSV",
                data=csv,
                file_name="progress_projection.csv",
                mime="text/csv",
            )
        
        with tab2:
            # Create a more condensed view showing only key weeks (starting, 1/4, 1/2, 3/4, ending)
            num_weeks = len(progress_table) - 1  # Exclude week 0
            weeks_to_show = [0]  # Always show starting point
            
            if num_weeks >= 4:
                # Add quarter points
                weeks_to_show.extend([
                    max(1, round(num_weeks * 0.25)),
                    round(num_weeks * 0.5),
                    round(num_weeks * 0.75),
                    num_weeks  # Final week
                ])
            else:
                # For shorter plans, just show all weeks
                weeks_to_show.extend(list(range(1, num_weeks + 1)))
            
            # Select rows for the specified weeks
            summary_table = progress_table[progress_table['Week'].isin(weeks_to_show)]
            
            # Choose only the most relevant columns for the summary
            summary_columns = [
                'Date', 'Week', 'Starting Weight (lbs)', 'Ending Weight (lbs)', 
                'Weekly Change (lbs)', 'Ending Body Fat %', 'Daily Energy Target (kcal)'
            ]
            
            # Display the summary table
            st.dataframe(summary_table[summary_columns])
        
        with tab3:
            # Create visualization of the progress
            st.subheader("Projected Body Composition Changes")
            
            # Create a line chart for weight changes
            fig, ax1 = plt.subplots(figsize=(10, 6))
            
            # Plot weight progression
            ax1.plot(progress_table['Week'], progress_table['Ending Weight (lbs)'], 
                    'b-', linewidth=2, label='Weight (lbs)')
            ax1.set_xlabel('Week')
            ax1.set_ylabel('Weight (lbs)', color='b')
            ax1.tick_params('y', colors='b')
            
            # Create a second y-axis for body fat percentage
            ax2 = ax1.twinx()
            ax2.plot(progress_table['Week'], progress_table['Ending Body Fat %'], 
                    'r-', linewidth=2, label='Body Fat %')
            ax2.set_ylabel('Body Fat %', color='r')
            ax2.tick_params('y', colors='r')
            
            # Add a grid for better readability
            ax1.grid(True, alpha=0.3)
            
            # Add title and legend
            plt.title('Projected Weight and Body Fat Changes')
            
            # Combine legends from both axes
            lines1, labels1 = ax1.get_legend_handles_labels()
            lines2, labels2 = ax2.get_legend_handles_labels()
            ax1.legend(lines1 + lines2, labels1 + labels2, loc='best')
            
            st.pyplot(fig)
            
            # Create a second chart showing fat mass and fat-free mass changes
            fig2, ax = plt.subplots(figsize=(10, 6))
            
            # Plot fat mass and fat-free mass
            ax.stackplot(progress_table['Week'], 
                        progress_table['Ending Fat Mass (lbs)'], 
                        progress_table['Ending FFM (lbs)'],
                        labels=['Fat Mass', 'Fat-Free Mass'],
                        colors=['#ff9999', '#66b3ff'],
                        alpha=0.7)
            
            ax.set_xlabel('Week')
            ax.set_ylabel('Weight (lbs)')
            ax.grid(True, alpha=0.3)
            
            # Add title and legend
            plt.title('Projected Body Composition Breakdown')
            plt.legend(loc='best')
            
            st.pyplot(fig2)
            
            # Create a snapshot of key metrics
            st.subheader("Key Metrics")
            
            # Create three columns for start, change, and end values
            col1, col2, col3 = st.columns(3)
            
            with col1:
                st.markdown("### Starting")
                st.metric("Weight", f"{current_weight_lbs:.1f} lbs")
                st.metric("Body Fat %", f"{current_bf:.1f}%")
                st.metric("Fat Mass", f"{current_fat_mass_lbs:.1f} lbs")
                st.metric("Fat-Free Mass", f"{current_fat_free_mass_lbs:.1f} lbs")
            
            with col2:
                st.markdown("### Change")
                weight_change = target_weight_lbs - current_weight_lbs
                bf_change = target_bf - current_bf
                fat_mass_change = (target_weight_lbs * (target_bf/100)) - (current_weight_lbs * (current_bf/100))
                ffm_change = weight_change - fat_mass_change
                
                st.metric("Weight", f"{weight_change:+.1f} lbs")
                st.metric("Body Fat %", f"{bf_change:+.1f}%")
                st.metric("Fat Mass", f"{fat_mass_change:+.1f} lbs")
                st.metric("Fat-Free Mass", f"{ffm_change:+.1f} lbs")
            
            with col3:
                st.markdown("### Ending")
                st.metric("Weight", f"{target_weight_lbs:.1f} lbs")
                st.metric("Body Fat %", f"{target_bf:.1f}%")
                st.metric("Fat Mass", f"{target_weight_lbs * (target_bf/100):.1f} lbs")
                st.metric("Fat-Free Mass", f"{target_weight_lbs * (1-target_bf/100):.1f} lbs")
    else:
        st.warning("Unable to generate the detailed progress table. Please ensure all required information is provided.")

# Show navigation hint
st.markdown("---")
st.markdown("👈 Use the sidebar to navigate between pages")
st.markdown("👉 Next step: [Nutrition Plan](/Nutrition_Plan)")
