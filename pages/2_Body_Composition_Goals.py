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
    
    # SECTION 1: Reference tables in collapsible section
    if goal_type == "Lose fat":
        with st.expander("📊 View Fat Loss Reference Tables"):
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
            
    elif goal_type == "Gain muscle":
        with st.expander("📊 View Muscle Gain Reference Tables"):
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
    
    # SECTION 2: Reference photos in collapsible section
    with st.expander("📷 View Body Fat Percentage Reference Photos"):
        ref_photo_path = "images/ref_photos.jpg"
        if os.path.exists(ref_photo_path):
            st.image(ref_photo_path, caption="Body Fat Percentage Reference - Men (top) and Women (bottom)", use_container_width=True)
            st.write("These visual references can help you understand how different body fat percentages look.")
        else:
            alt_path = "attached_assets/ref_photos.jpg"
            if os.path.exists(alt_path):
                st.image(alt_path, caption="Body Fat Percentage Reference", use_container_width=True)
            else:
                st.warning("Reference photos not available. Visit the Reference Photos page for examples.")
                st.link_button("Go to Reference Photos", url="Reference_Photos")
    
    # SECTION 2.5: Fat Mass and Fat-Free Mass Index information
    with st.expander("📊 View Detailed Information on Fat Mass Index and Fat-Free Mass Index"):
        st.subheader("Body Composition Indices Explained")
        
        # Fat Mass Index explanation
        st.write("### Fat Mass Index (FMI)")
        st.write("""
        **What is FMI?** The Fat Mass Index is a measure of the amount of fat mass relative to height. 
        It is calculated by dividing fat mass (in kg) by height squared (in meters²).
        
        **FMI Categories:**
        - **Extremely Lean**: 2-3 kg/m² - Very low levels of body fat, typically seen in elite athletes or bodybuilders during competition
        - **Lean**: 3.1-5.2 kg/m² - Low body fat levels, common in athletes and very active individuals
        - **Considered Healthy**: 5.3-7.2 kg/m² - Normal and healthy levels of body fat
        - **Slightly Overfat**: 7.3-9.1 kg/m² - Slightly elevated body fat levels
        - **Overfat**: 9.2-12.9 kg/m² - Elevated body fat levels that may lead to health concerns
        - **Significantly Overfat**: 13+ kg/m² - High body fat levels with increased health risks
        """)
        
        # Fat-Free Mass Index explanation
        st.write("### Fat-Free Mass Index (FFMI)")
        st.write("""
        **What is FFMI?** The Fat-Free Mass Index is a measure of muscle and lean tissue relative to height.
        It is calculated by dividing fat-free mass (in kg) by height squared (in meters²).
        
        **Normalized FFMI** adjusts for height differences to provide better comparisons between individuals.
        
        **FFMI Categories:**
        - **Undermuscled**: 8-16 kg/m² - Lower levels of muscle mass
        - **Moderately Undermuscled**: 16.1-17.8 kg/m² - Slightly below average muscle mass
        - **Considered Healthy**: 17.9-22 kg/m² - Normal and healthy levels of muscle mass
        - **Muscular**: 22.1-25 kg/m² - Above average muscle mass, typical of strength athletes
        - **High**: 25.1+ kg/m² - Very high muscle mass, usually seen in elite strength athletes
        
        *Note: FFMI values above 25 are difficult to achieve without performance-enhancing substances.*
        """)
        
        # Body Composition Recommendations
        st.write("### How to Use These Indices")
        st.write("""
        The combination of your FMI and FFMI categories helps determine the most appropriate body composition goal:
        
        - If your FMI is high and FFMI is low or average: Focus on losing fat while maintaining muscle
        - If your FMI is low or average and FFMI is low: Focus on building muscle
        - If your FMI is low and FFMI is high: Consider maintenance or a slight surplus for performance
        - If your FMI is high and FFMI is high: Consider body recomposition (lose fat while maintaining muscle)
        
        The "Body Composition Category Reference Tables" provide specific recommendations based on your unique combination.
        """)
    
    # SECTION 3: Calculate current composition values
    current_fat_mass_kg = current_weight_kg * (current_bf/100)
    current_fat_mass_lbs = current_fat_mass_kg * 2.20462
    current_fat_free_mass_kg = current_weight_kg - current_fat_mass_kg
    current_fat_free_mass_lbs = current_fat_free_mass_kg * 2.20462
    
    # Body Composition Analysis Table - Core of the page
    st.markdown("---")
    st.subheader("Body Composition Analysis")
    
    # Create initial dataframe with current values
    comp_data = {
        'Measurement': ['Weight', 'Fat Mass', 'Fat-Free Mass', 'Body Fat %'],
        'Current': [f"{current_weight_lbs:.1f} lbs", f"{current_fat_mass_lbs:.1f} lbs", f"{current_fat_free_mass_lbs:.1f} lbs", f"{current_bf:.1f}%"]
    }
    
    # Set defaults for target values based on goal type
    if goal_type == "Lose fat":
        target_fat_mass_lbs = max(current_fat_mass_lbs * 0.85, current_fat_mass_lbs - 10)
        target_ffm_lbs = current_fat_free_mass_lbs  # Assume preservation of FFM
    elif goal_type == "Gain muscle":
        target_fat_mass_lbs = current_fat_mass_lbs  # Might increase slightly during bulking
        target_ffm_lbs = min(current_fat_free_mass_lbs * 1.05, current_fat_free_mass_lbs + 5)
    else:  # Maintain
        target_fat_mass_lbs = current_fat_mass_lbs
        target_ffm_lbs = current_fat_free_mass_lbs
    
    # Calculate target weight and body fat percentage
    target_weight_lbs = target_fat_mass_lbs + target_ffm_lbs
    target_bf = (target_fat_mass_lbs / target_weight_lbs) * 100
    
    # Add target values to the dataframe
    comp_data['Target'] = [
        f"{target_weight_lbs:.1f} lbs", 
        f"{target_fat_mass_lbs:.1f} lbs", 
        f"{target_ffm_lbs:.1f} lbs", 
        f"{target_bf:.1f}%"
    ]
    
    # Calculate changes
    weight_change = target_weight_lbs - current_weight_lbs
    fat_change = target_fat_mass_lbs - current_fat_mass_lbs
    ffm_change = target_ffm_lbs - current_fat_free_mass_lbs
    bf_change = target_bf - current_bf
    
    # Add change values to the dataframe
    comp_data['Change'] = [
        f"{weight_change:.1f} lbs",
        f"{fat_change:.1f} lbs",
        f"{ffm_change:.1f} lbs",
        f"{bf_change:.1f}%"
    ]
    
    # Create the table
    comp_df = pd.DataFrame(comp_data)
    
    # Display the table - this is for display only, not editable
    st.table(comp_df)
    
    # Calculate and display body composition indices
    height_cm = st.session_state.user_info['height_cm']
    height_m = height_cm / 100
    
    # Calculate FMI (Fat Mass Index)
    fmi = current_fat_mass_kg / (height_m * height_m)
    
    # Find which FMI category the user is in
    fmi_category_name = "Unknown"
    for category in fmi_categories:
        if category["lower"] <= fmi <= category["upper"]:
            fmi_category_name = category["name"]
            break
    
    # Calculate FFMI (Fat-Free Mass Index)
    ffmi = current_fat_free_mass_kg / (height_m * height_m)
    
    # Apply the FFMI normalization formula for heights != 1.8m
    ffmi_normalized = ffmi * (1.8 / height_m)
    
    # Find which FFMI category the user is in
    ffmi_category_name = "Unknown"
    for category in ffmi_categories:
        if category["lower"] <= ffmi <= category["upper"]:
            ffmi_category_name = category["name"]
            break
    
    # Get the recommendation based on FMI and FFMI categories
    combo_rec = utils.get_combined_category_rates(fmi_category_name, ffmi_category_name)
    recommended_category = combo_rec.get("recommendation", "No specific recommendation available")
    
    # Display body composition indices and categories
    st.subheader("Body Composition Indices")
    indices_col1, indices_col2 = st.columns(2)
    
    with indices_col1:
        st.metric("Fat Mass Index (FMI)", f"{fmi:.1f} kg/m²")
        st.write(f"Category: **{fmi_category_name}**")
        
    with indices_col2:
        st.metric("Fat-Free Mass Index (FFMI)", f"{ffmi:.1f} kg/m²")
        st.write(f"Normalized FFMI: **{ffmi_normalized:.1f}** kg/m²")
        st.write(f"Category: **{ffmi_category_name}**")
    
    st.write(f"**Recommendation based on your current body composition**: {recommended_category}")
    
    with st.expander("View Body Composition Category Reference Tables"):
        # Create matrix data with category combinations
        fmi_categories_short = [c["name"] for c in fmi_categories]
        ffmi_categories_short = [c["name"] for c in ffmi_categories]
        
        matrix_data = []
        for fmi_cat in fmi_categories_short:
            row_data = {'FMI': fmi_cat}
            for ffmi_cat in ffmi_categories_short:
                combo_rec = utils.get_combined_category_rates(fmi_cat, ffmi_cat)
                recommendation = combo_rec.get("recommendation", "")
                row_data[ffmi_cat] = recommendation
            matrix_data.append(row_data)
        
        recommendation_matrix = pd.DataFrame(matrix_data)
        recommendation_matrix = recommendation_matrix.set_index('FMI')
        
        st.write("#### Body Composition Recommendations by FMI/FFMI Combination")
        st.table(recommendation_matrix)
    
    # Editable target values
    st.markdown("---")
    st.subheader("Set Your Target Body Composition")
    
    # Display current values for reference
    current_col1, current_col2 = st.columns(2)
    with current_col1:
        st.write("### Current Values")
        st.info(f"""
        - Weight: **{current_weight_lbs:.1f} lbs**
        - Body Fat: **{current_bf:.1f}%**
        - Fat Mass: **{current_fat_mass_lbs:.1f} lbs**
        - Fat-Free Mass: **{current_fat_free_mass_lbs:.1f} lbs**
        """)
    
    with current_col2:
        st.write("### Current Body Composition Indices")
        st.info(f"""
        - FMI: **{fmi:.1f} kg/m²** ({fmi_category_name})
        - FFMI: **{ffmi:.1f} kg/m²** ({ffmi_category_name})
        - Recommendation: {recommended_category}
        """)
    
    st.write("### Set Target Values")
    st.write("Adjust any of these values and the others will update automatically:")
    
    # Set up columns for target inputs
    target_col1, target_col2, target_col3 = st.columns(3)
    
    # Column 1: Body Fat percentage
    with target_col1:
        # Min/Max BF limits based on goal
        min_target_bf = max(3.0, current_bf * 0.7) if goal_type == "Lose fat" else max(3.0, current_bf * 0.9)
        max_target_bf = min(50.0, current_bf * 1.1) if goal_type == "Gain muscle" else min(50.0, current_bf * 0.99)
        
        # For maintain goal type, set reasonable limits
        if goal_type == "Maintain current composition":
            min_target_bf = max(3.0, current_bf * 0.9)
            max_target_bf = min(50.0, current_bf * 1.1)
        
        # Target body fat percentage
        new_target_bf = st.number_input(
            "Target Body Fat (%)",
            min_value=min_target_bf,
            max_value=max_target_bf,
            value=target_bf,
            step=0.1,
            key="target_bf_input",
            help="Enter your target body fat percentage"
        )
    
    # Column 2: Target Fat Mass
    with target_col2:
        # Adjust limits based on goal
        fat_mass_min = max(current_fat_mass_lbs - 25, 5.0) if goal_type == "Lose fat" else max(current_fat_mass_lbs * 0.8, 5.0)
        fat_mass_max = current_fat_mass_lbs - 0.5 if goal_type == "Lose fat" else current_fat_mass_lbs * 1.2
        
        # For maintain, use different limits
        if goal_type == "Maintain current composition":
            fat_mass_min = max(current_fat_mass_lbs * 0.9, 5.0)
            fat_mass_max = current_fat_mass_lbs * 1.1
        
        new_target_fat_mass_lbs = st.number_input(
            "Target Fat Mass (lbs)", 
            min_value=fat_mass_min,
            max_value=fat_mass_max,
            value=float(target_fat_mass_lbs),
            step=0.5,
            key="target_fat_input",
            help="Enter your target fat mass in pounds"
        )
    
    # Column 3: Target Fat-Free Mass
    with target_col3:
        # Adjust limits based on goal
        ffm_min = current_fat_free_mass_lbs * 0.95 if goal_type == "Lose fat" else current_fat_free_mass_lbs + 0.5
        ffm_max = current_fat_free_mass_lbs * 1.05 if goal_type == "Lose fat" else min(current_fat_free_mass_lbs + 10, current_fat_free_mass_lbs * 1.1)
        
        # For maintain, use different limits
        if goal_type == "Maintain current composition":
            ffm_min = current_fat_free_mass_lbs * 0.9
            ffm_max = current_fat_free_mass_lbs * 1.1
        
        new_target_ffm_lbs = st.number_input(
            "Target Fat-Free Mass (lbs)",
            min_value=ffm_min,
            max_value=ffm_max,
            value=float(target_ffm_lbs),
            step=0.5,
            key="target_ffm_input",
            help="Enter your target fat-free mass in pounds"
        )
    
    # Determine which field was last changed
    last_changed = None
    if "last_changed" not in st.session_state:
        st.session_state.last_changed = "bf"  # Default to body fat
    
    # Check which field was last modified
    for field in ["bf", "fat", "ffm"]:
        if f"target_{field}_input" in st.session_state:
            st.session_state.last_changed = field
            last_changed = field
            break
    
    # Recalculate values based on last changed field
    if last_changed == "bf":
        # Body fat % was changed, update fat mass and FFM
        target_bf = new_target_bf
        # Calculate assuming same total weight initially
        target_weight_lbs = new_target_fat_mass_lbs + new_target_ffm_lbs
        target_fat_mass_lbs = target_weight_lbs * (target_bf / 100)
        target_ffm_lbs = target_weight_lbs - target_fat_mass_lbs
    elif last_changed == "fat":
        # Fat mass was changed, update body fat % keeping FFM the same
        target_fat_mass_lbs = new_target_fat_mass_lbs
        target_ffm_lbs = new_target_ffm_lbs
        target_weight_lbs = target_fat_mass_lbs + target_ffm_lbs
        target_bf = (target_fat_mass_lbs / target_weight_lbs) * 100
    elif last_changed == "ffm":
        # FFM was changed, update body fat % keeping fat mass the same
        target_fat_mass_lbs = new_target_fat_mass_lbs
        target_ffm_lbs = new_target_ffm_lbs
        target_weight_lbs = target_fat_mass_lbs + target_ffm_lbs
        target_bf = (target_fat_mass_lbs / target_weight_lbs) * 100
    else:
        # Default case - use the new values directly
        target_fat_mass_lbs = new_target_fat_mass_lbs
        target_ffm_lbs = new_target_ffm_lbs
        target_weight_lbs = target_fat_mass_lbs + target_ffm_lbs
        target_bf = (target_fat_mass_lbs / target_weight_lbs) * 100
    
    # Display the calculated values
    st.write("### Target Body Composition Summary")
    st.success(f"""
    - **Target Weight**: {target_weight_lbs:.1f} lbs ({(target_weight_lbs-current_weight_lbs):.1f} lbs change)
    - **Target Body Fat**: {target_bf:.1f}% ({(target_bf-current_bf):.1f}% change)
    - **Target Fat Mass**: {target_fat_mass_lbs:.1f} lbs ({(target_fat_mass_lbs-current_fat_mass_lbs):.1f} lbs change)
    - **Target Fat-Free Mass**: {target_ffm_lbs:.1f} lbs ({(target_ffm_lbs-current_fat_free_mass_lbs):.1f} lbs change)
    """)
    
    # Convert to kg for backend calculations
    target_fat_mass_kg = target_fat_mass_lbs / 2.20462
    target_ffm_kg = target_ffm_lbs / 2.20462
    target_weight_kg = target_weight_lbs / 2.20462
    
    # Display the calculated target weight and body fat
    st.success(f"Calculated Target Weight: {target_weight_lbs:.1f} lbs | Target Body Fat: {target_bf:.1f}%")
    
    # Calculate weekly changes
    weight_change = target_weight_lbs - current_weight_lbs
    weekly_weight_change_lbs = weight_change / 12  # Default to 12 weeks if timeline not yet set
    weekly_weight_change_pct = (weekly_weight_change_lbs / current_weight_lbs) * 100
    
    # Show weekly changes info
    st.subheader("Weekly Changes")
    st.write(f"Weight Change: **{weekly_weight_change_lbs:.2f} lbs/week** ({weekly_weight_change_pct:.2f}% of body weight/week)")
    
    # Fat and FFM changes
    fat_change_lbs = target_fat_mass_lbs - current_fat_mass_lbs
    ffm_change_lbs = target_ffm_lbs - current_fat_free_mass_lbs
    
    # Composition breakdown of changes
    if abs(weight_change) > 0:
        fat_change_pct = (fat_change_lbs / weight_change) * 100
        if goal_type == "Lose fat":
            st.write(f"Fat Loss Composition: **{abs(fat_change_pct):.1f}%** of weight loss is from fat")
        elif goal_type == "Gain muscle":
            st.write(f"Fat Gain Composition: **{fat_change_pct:.1f}%** of weight gain is from fat")
    
    # Use preferences already selected in Initial Setup
    st.markdown("---")
    
    # Store default preferences in goal_additional_prefs
    goal_additional_prefs = {
        "performance_impact": "I want to balance performance and fat loss equally",
        "aggressive_deficit": "Moderate: Balanced approach",
        "body_comp_tradeoff": "I want a balanced approach to gain muscle with moderate fat gain",
        "aggressive_surplus": "Moderate: Balanced approach",
        "commitment_level": "I can commit to a mostly consistent diet, regular workouts, tracking most meals, and good sleep for most of the program."
    }
    
    # Load any existing preferences from user_info if available
    if "preferences" in st.session_state.user_info:
        user_prefs = st.session_state.user_info.get("preferences", {})
        for key, value in user_prefs.items():
            if value:  # Only update if the preference has a value
                goal_additional_prefs[key] = value
    
    # Timeline and start date
    st.markdown("---")
    st.subheader("Timeline")
    
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
    
    # Convert stored date string to datetime.date if needed
    if isinstance(stored_start_date, str):
        try:
            stored_start_date = datetime.strptime(stored_start_date, '%Y-%m-%d').date()
        except:
            stored_start_date = default_start_date
    elif not isinstance(stored_start_date, (datetime, datetime.date)):
        stored_start_date = default_start_date
    
    # Format date as string for Streamlit
    default_date_str = stored_start_date.strftime('%Y-%m-%d') if stored_start_date else default_start_date.strftime('%Y-%m-%d')
    
    start_date_str = st.date_input(
        "Start Date",
        value=datetime.strptime(default_date_str, '%Y-%m-%d').date(),
        min_value=default_start_date - timedelta(days=30),
        max_value=default_start_date + timedelta(days=30)
    ).strftime('%Y-%m-%d')
    
    # Submit button
    submit_button = st.form_submit_button("Set Goals")
    
    if submit_button:
        # Recalculate weekly rates with the chosen timeline
        weekly_weight_change_lbs = weight_change / timeline_weeks
        weekly_weight_change_pct = (weekly_weight_change_lbs / current_weight_lbs) * 100
        
        # Save the goals to session state
        st.session_state.goal_info = {
            "goal_type": goal_type_code,
            "target_weight_kg": target_weight_kg,
            "target_weight_lbs": target_weight_lbs,
            "target_body_fat": target_bf,
            "target_fat_mass_kg": target_fat_mass_kg,
            "target_fat_mass_lbs": target_fat_mass_lbs,
            "target_ffm_kg": target_ffm_kg,
            "target_ffm_lbs": target_ffm_lbs,
            "timeline_weeks": timeline_weeks,
            "start_date": start_date_str,
            "additional_preferences": goal_additional_prefs
        }
        
        # Calculate recommended rates based on body composition categories
        # Calculate FMI (Fat Mass Index)
        height_cm = st.session_state.user_info['height_cm']
        height_m = height_cm / 100
        fmi = current_fat_mass_kg / (height_m * height_m)
        
        # Find which FMI category the user is in
        fmi_category_name = "Unknown"
        for category in fmi_categories:
            if category["lower"] <= fmi <= category["upper"]:
                fmi_category_name = category["name"]
                break
        
        # Calculate FFMI (Fat-Free Mass Index)
        ffmi = current_fat_free_mass_kg / (height_m * height_m)
        
        # Find which FFMI category the user is in
        ffmi_category_name = "Unknown"
        for category in ffmi_categories:
            if category["lower"] <= ffmi <= category["upper"]:
                ffmi_category_name = category["name"]
                break
        
        # Create user_data dict in the format expected by calculate_recommended_rate
        user_data = {
            "fmi_category": fmi_category_name,
            "ffmi_category": ffmi_category_name,
            "preferences": goal_additional_prefs
        }
        rec_rates = utils.calculate_recommended_rate(user_data, goal_type_code)
        
        if rec_rates:
            st.session_state.goal_info["recommended_rates"] = rec_rates
        
        # Save data to CSV
        utils.save_data()
        
        st.success("Goals saved successfully!")
        st.rerun()

# Display expected progress if goals have been set
if st.session_state.goal_info.get('target_weight_kg'):
    st.markdown("---")
    
    # Get goal info
    goal_type = st.session_state.goal_info.get('goal_type')
    current_weight_kg = st.session_state.user_info['weight_kg']
    current_weight_lbs = current_weight_kg * 2.20462
    current_bf = st.session_state.user_info['body_fat_percentage']
    target_weight_kg = st.session_state.goal_info.get('target_weight_kg')
    target_weight_lbs = target_weight_kg * 2.20462
    target_bf = st.session_state.goal_info.get('target_body_fat')
    timeline_weeks = st.session_state.goal_info.get('timeline_weeks')
    start_date_str = st.session_state.goal_info.get('start_date')
    
    # Calculate current composition
    current_fat_mass_kg = current_weight_kg * (current_bf/100)
    current_fat_mass_lbs = current_fat_mass_kg * 2.20462
    current_fat_free_mass_kg = current_weight_kg - current_fat_mass_kg
    current_fat_free_mass_lbs = current_fat_free_mass_kg * 2.20462
    
    # Calculate target composition
    target_fat_mass_kg = target_weight_kg * (target_bf/100)
    target_fat_mass_lbs = target_fat_mass_kg * 2.20462
    target_ffm_kg = target_weight_kg - target_fat_mass_kg
    target_ffm_lbs = target_ffm_kg * 2.20462
    
    # Calculate weekly changes based on user's input (not recommendation)
    weight_change_kg = target_weight_kg - current_weight_kg
    weight_change_lbs = weight_change_kg * 2.20462
    weekly_weight_change_kg = weight_change_kg / timeline_weeks
    weekly_weight_change_lbs = weekly_weight_change_kg * 2.20462
    weekly_weight_change_pct = (weekly_weight_change_kg / current_weight_kg) * 100
    
    # Fat and FFM changes
    fat_change_kg = target_fat_mass_kg - current_fat_mass_kg
    fat_change_lbs = fat_change_kg * 2.20462
    ffm_change_kg = target_ffm_kg - current_fat_free_mass_kg
    ffm_change_lbs = ffm_change_kg * 2.20462
    
    # Composition breakdown of changes
    if abs(weight_change_kg) > 0:
        fat_change_pct = (fat_change_kg / weight_change_kg) * 100
    else:
        fat_change_pct = 0
    
    # SECTION 5: EXPECTED PROGRESS AND TIMELINE
    st.subheader("Expected Progress and Timeline")
    
    # Calculate TDEE for energy targets
    gender = st.session_state.user_info['gender']
    age = st.session_state.user_info['age']
    height_cm = st.session_state.user_info['height_cm']
    activity_level = st.session_state.user_info['activity_level']
    workouts_per_week = st.session_state.user_info.get('workouts_per_week', 3)
    
    tdee = utils.calculate_tdee(
        gender, 
        current_weight_kg, 
        height_cm, 
        age, 
        activity_level, 
        workouts_per_week
    )
    
    # Generate detailed weekly progress table
    with st.expander("📋 View Detailed Weekly Progress Projection"):
        progress_table = utils.generate_detailed_progress_table(
            current_weight_lbs,
            current_bf,
            target_weight_lbs,
            target_bf,
            abs(weekly_weight_change_pct/100),  # Convert to decimal
            abs(fat_change_pct/100),  # Convert to decimal
            int(timeline_weeks),
            start_date_str,
            tdee,
            gender,
            age,
            height_cm
        )
        
        # Check if the detailed progress table was generated successfully
        if not progress_table.empty:
            # Display summary of key weeks (0, 1/4, 1/2, 3/4, and final)
            st.write("#### Weekly Progress Summary")
            
            # Determine key weeks to show
            num_weeks = len(progress_table) - 1  # Exclude week 0
            weeks_to_show = [0]  # Always include starting point
            
            # Add quarter points and end point
            if num_weeks >= 4:
                weeks_to_show.extend([
                    int(num_weeks * 0.25),
                    int(num_weeks * 0.5),
                    int(num_weeks * 0.75),
                    num_weeks
                ])
            else:
                # For short timelines, show all weeks
                weeks_to_show.extend(list(range(1, num_weeks + 1)))
            
            # Remove duplicates and sort
            weeks_to_show = sorted(list(set(weeks_to_show)))
            
            # Create a summary table
            summary_table = progress_table[progress_table['Week'].isin(weeks_to_show)]
            
            # Simplify the displayed table to focus on key metrics
            summary_display = summary_table[['Week', 'Date', 'Ending Weight (lbs)', 'Ending Body Fat %', 
                                             'Ending Fat Mass (lbs)', 'Ending FFM (lbs)',
                                             'Daily Energy Target (kcal)']]
            
            st.dataframe(summary_display, use_container_width=True)
            
            # Create visualization of the progress
            st.write("#### Visualized Progress")
            
            fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(10, 12), gridspec_kw={'height_ratios': [1, 1]})
            
            # Plot weight progression
            ax1.plot(progress_table['Week'], progress_table['Ending Weight (lbs)'], 
                    'b-', linewidth=2, label='Weight')
            ax1.set_ylabel('Weight (lbs)')
            ax1.set_title('Expected Weight Progress')
            ax1.set_xlabel('Week')
            ax1.grid(True, linestyle='--', alpha=0.7)
            
            # Plot body fat progression
            ax2.plot(progress_table['Week'], progress_table['Ending Body Fat %'], 
                    'r-', linewidth=2, label='Body Fat %')
            ax2.set_ylabel('Body Fat %')
            ax2.set_title('Expected Body Fat Percentage Progress')
            ax2.set_xlabel('Week')
            ax2.grid(True, linestyle='--', alpha=0.7)
            
            st.pyplot(fig)
            
            # Body composition stacked area chart
            st.write("#### Body Composition Progress")
            
            fig, ax = plt.subplots(figsize=(10, 6))
            ax.stackplot(progress_table['Week'], 
                        progress_table['Ending Fat Mass (lbs)'], 
                        progress_table['Ending FFM (lbs)'],
                        labels=['Fat Mass', 'Fat-Free Mass'],
                        colors=['#ff9999', '#66b3ff'],
                        alpha=0.8)
            
            ax.set_title('Body Composition Progress')
            ax.set_xlabel('Week')
            ax.set_ylabel('Weight (lbs)')
            ax.legend(loc='upper right')
            ax.grid(True, linestyle='--', alpha=0.3)
            
            # Add a horizontal line for the starting weight
            ax.axhline(y=current_weight_lbs, color='k', linestyle='--', alpha=0.5)
            
            st.pyplot(fig)
            
            # Energy balance and targets
            st.write("#### Energy Targets")
            
            fig, ax = plt.subplots(figsize=(10, 6))
            
            energy_balance = progress_table['Daily Energy Balance (kcal)'].tolist()
            tdee_list = progress_table['Daily TDEE (kcal)'].tolist()
            energy_target = progress_table['Daily Energy Target (kcal)'].tolist()
            
            ax.plot(progress_table['Week'], tdee_list, 'g-', label='TDEE', linewidth=2)
            ax.plot(progress_table['Week'], energy_target, 'b-', label='Energy Target', linewidth=2)
            
            if goal_type == "lose_fat":
                ax.fill_between(progress_table['Week'], tdee_list, energy_target, 
                              color='r', alpha=0.3, label='Deficit')
            elif goal_type == "gain_muscle":
                ax.fill_between(progress_table['Week'], tdee_list, energy_target, 
                              color='g', alpha=0.3, label='Surplus')
            
            ax.set_title('Energy Balance Over Time')
            ax.set_xlabel('Week')
            ax.set_ylabel('Calories (kcal)')
            ax.legend(loc='upper right')
            ax.grid(True, linestyle='--', alpha=0.7)
            
            st.pyplot(fig)
            
            # Display energy availability if user is actively training
            if workouts_per_week >= 3:
                st.write("#### Energy Availability")
                
                fig, ax = plt.subplots(figsize=(10, 5))
                
                energy_availability = progress_table['Energy Availability (kcal/kg FFM)'].tolist()
                
                ax.plot(progress_table['Week'], energy_availability, 
                       'purple', linewidth=2)
                
                # Add reference zones for EA
                ax.axhspan(30, 45, alpha=0.2, color='green', label='Optimal Range (30-45)')
                ax.axhspan(25, 30, alpha=0.2, color='yellow', label='Caution Range (25-30)')
                ax.axhspan(0, 25, alpha=0.2, color='red', label='Low EA Range (<25)')
                
                ax.set_title('Energy Availability (kcal/kg FFM)')
                ax.set_xlabel('Week')
                ax.set_ylabel('kcal/kg FFM')
                ax.legend(loc='upper right')
                ax.grid(True, linestyle='--', alpha=0.7)
                
                st.pyplot(fig)
            
            # Provide option to download the progress table
            csv = progress_table.to_csv(index=False)
            st.download_button(
                label="Download Progress Table as CSV",
                data=csv,
                file_name="progress_projection.csv",
                mime="text/csv"
            )
        else:
            st.warning("Unable to generate the detailed progress table. Please ensure all required information is provided.")