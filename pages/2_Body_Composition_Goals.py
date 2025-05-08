import streamlit as st
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import sys
import os

# Add the root directory to the path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import utils

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
        goal_type = st.radio(
            "What is your primary goal?",
            options=["Lose fat", "Gain muscle", "Maintain current composition"],
            index=initial_goal_index
        )
        
        # Convert the display name to the internal code
        goal_type_code = "lose_fat" if goal_type == "Lose fat" else "gain_muscle" if goal_type == "Gain muscle" else "maintain"
        
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
    
    # Calculate weekly changes
    weekly_weight_change_kg = (target_weight_kg - current_weight_kg) / timeline_weeks
    weekly_weight_change_lbs = (target_weight_lbs - current_weight_lbs) / timeline_weeks
    weekly_bf_change = (target_bf - current_bf) / timeline_weeks
    
    # Calculate lean body mass changes
    current_lbm_kg = current_weight_kg * (1 - current_bf/100)
    target_lbm_kg = target_weight_kg * (1 - target_bf/100)
    lbm_change_kg = target_lbm_kg - current_lbm_kg
    
    # Calculate Fat Mass and Fat-Free Mass
    current_fat_mass_kg = current_weight_kg * (current_bf/100)
    current_fat_free_mass_kg = current_weight_kg - current_fat_mass_kg
    
    # Convert to pounds
    current_fat_mass_lbs = current_fat_mass_kg * 2.20462
    current_fat_free_mass_lbs = current_fat_free_mass_kg * 2.20462
    
    # Calculate indices
    fat_mass_index = current_fat_mass_kg / (height_m * height_m)
    fat_free_mass_index = current_fat_free_mass_kg / (height_m * height_m)
    
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
        
        # FMI categories
        fmi_categories = [
            {"name": "Extremely Lean", "lower": 2, "upper": 3},
            {"name": "Lean", "lower": 3.1, "upper": 5.2},
            {"name": "Considered Healthy", "lower": 5.3, "upper": 7.2},
            {"name": "Slightly Overfat", "lower": 7.3, "upper": 9.1},
            {"name": "Overfat", "lower": 9.2, "upper": 12.9},
            {"name": "Significantly Overfat", "lower": 13, "upper": 35}
        ]
        
        # Find user's category
        user_fmi_category = "Unknown"
        for category in fmi_categories:
            if category["lower"] <= fat_mass_index <= category["upper"]:
                user_fmi_category = category["name"]
                break
        
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
        
        # FFMI categories
        ffmi_categories = [
            {"name": "Undermuscled", "lower": 8, "upper": 16},
            {"name": "Moderately Undermuscled", "lower": 16.1, "upper": 17.8},
            {"name": "Considered Healthy", "lower": 17.9, "upper": 22},
            {"name": "Muscular", "lower": 22.1, "upper": 25},
            {"name": "High", "lower": 25.1, "upper": 35}
        ]
        
        # Find user's category
        user_ffmi_category = "Unknown"
        for category in ffmi_categories:
            if category["lower"] <= fat_free_mass_index <= category["upper"]:
                user_ffmi_category = category["name"]
                break
        
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
        st.markdown(pd.DataFrame(fmi_ranges).to_markdown(index=False), unsafe_allow_html=True)
    
    with col2:
        st.subheader("Fat-Free Mass Ranges for Your Height")
        st.markdown(pd.DataFrame(ffmi_ranges).to_markdown(index=False), unsafe_allow_html=True)
    
    st.subheader("Expected Progress")
    
    # Create a progress table - use a simpler approach with step-based weeks
    # Create weeks at 0, 4, 8, etc. and include the final week
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
    
    progress_df = pd.DataFrame(progress_data)
    st.table(progress_df)
    
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

# Show navigation hint
st.markdown("---")
st.markdown("👈 Use the sidebar to navigate between pages")
st.markdown("👉 Next step: [Nutrition Plan](/Nutrition_Plan)")
