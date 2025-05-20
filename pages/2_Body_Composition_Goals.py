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

# Set up goals section
st.subheader("Set Your Goals")

# Current weight and body fat from user info
current_weight_kg = st.session_state.user_info['weight_kg']
current_weight_lbs = st.session_state.user_info.get('weight_lbs', current_weight_kg * 2.20462)
current_bf = st.session_state.user_info['body_fat_percentage']
height_cm = st.session_state.user_info['height_cm']
height_m = height_cm / 100

# Calculate current composition values
current_fat_mass_kg = current_weight_kg * (current_bf/100)
current_fat_mass_lbs = current_fat_mass_kg * 2.20462
current_fat_free_mass_kg = current_weight_kg - current_fat_mass_kg
current_fat_free_mass_lbs = current_fat_free_mass_kg * 2.20462

# Calculate current FMI and FFMI
current_fmi = current_fat_mass_kg / (height_m * height_m)
current_ffmi = current_fat_free_mass_kg / (height_m * height_m)
current_normalized_ffmi = current_ffmi * (1.8 / height_m)

# Display current measurements
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

# SECTION 3: Body Composition Analysis Table 
st.markdown("---")
st.subheader("Body Composition Analysis")

# Find categories for current values
current_fmi_category = "Unknown"
for category in fmi_categories:
    if category["lower"] <= current_fmi <= category["upper"]:
        current_fmi_category = category["name"]
        break
        
current_ffmi_category = "Unknown"
for category in ffmi_categories:
    if category["lower"] <= current_ffmi <= category["upper"]:
        current_ffmi_category = category["name"]
        break

# Set up targets and initialize session state if needed
if "target_bf" not in st.session_state:
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
    
    # Store in session state
    st.session_state.target_bf = target_bf
    st.session_state.target_fat = target_fat_mass_lbs
    st.session_state.target_ffm = target_ffm_lbs
    
    # Calculate and store target FMI and FFMI
    target_fat_mass_kg = target_fat_mass_lbs / 2.20462
    target_ffm_kg = target_ffm_lbs / 2.20462
    st.session_state.target_fmi = target_fat_mass_kg / (height_m * height_m)
    st.session_state.target_ffmi = target_ffm_kg / (height_m * height_m)

# Get target values from session state
target_bf = st.session_state.target_bf
target_fat_mass_lbs = st.session_state.target_fat
target_ffm_lbs = st.session_state.target_ffm
target_weight_lbs = target_fat_mass_lbs + target_ffm_lbs
target_fmi = st.session_state.target_fmi
target_ffmi = st.session_state.target_ffmi
target_normalized_ffmi = target_ffmi * (1.8 / height_m)

# Create initial dataframe with current values
comp_data = {
    'Measurement': [
        'Weight', 
        'Fat Mass', 
        'Fat-Free Mass', 
        'Body Fat %',
        'Fat Mass Index (FMI)',
        'Fat-Free Mass Index (FFMI)',
        'Normalized FFMI'
    ],
    'Current': [
        f"{current_weight_lbs:.1f} lbs", 
        f"{current_fat_mass_lbs:.1f} lbs", 
        f"{current_fat_free_mass_lbs:.1f} lbs", 
        f"{current_bf:.1f}%",
        f"{current_fmi:.1f} kg/m²",
        f"{current_ffmi:.1f} kg/m²",
        f"{current_normalized_ffmi:.1f} kg/m²"
    ]
}

# Add target values to the dataframe
comp_data['Target'] = [
    f"{target_weight_lbs:.1f} lbs", 
    f"{target_fat_mass_lbs:.1f} lbs", 
    f"{target_ffm_lbs:.1f} lbs", 
    f"{target_bf:.1f}%",
    f"{target_fmi:.1f} kg/m²",
    f"{target_ffmi:.1f} kg/m²",
    f"{target_normalized_ffmi:.1f} kg/m²"
]

# Calculate changes
weight_change = target_weight_lbs - current_weight_lbs
fat_change = target_fat_mass_lbs - current_fat_mass_lbs
ffm_change = target_ffm_lbs - current_fat_free_mass_lbs
bf_change = target_bf - current_bf
fmi_change = target_fmi - current_fmi
ffmi_change = target_ffmi - current_ffmi
normalized_ffmi_change = target_normalized_ffmi - current_normalized_ffmi

# Add change values to the dataframe
comp_data['Change'] = [
    f"{weight_change:.1f} lbs",
    f"{fat_change:.1f} lbs",
    f"{ffm_change:.1f} lbs",
    f"{bf_change:.1f}%",
    f"{fmi_change:.1f} kg/m²",
    f"{ffmi_change:.1f} kg/m²",
    f"{normalized_ffmi_change:.1f} kg/m²"
]

# Create and display the dataframe
comp_df = pd.DataFrame(comp_data)
st.dataframe(comp_df, use_container_width=True)

# Display category information
st.write("#### Body Composition Categories")
col1, col2 = st.columns(2)

with col1:
    st.write(f"**Current FMI Category**: {current_fmi_category}")
    st.write(f"**Current FFMI Category**: {current_ffmi_category}")

with col2:
    # Find categories for target values
    target_fmi_category = "Unknown"
    for category in fmi_categories:
        if category["lower"] <= target_fmi <= category["upper"]:
            target_fmi_category = category["name"]
            break
            
    target_ffmi_category = "Unknown"
    for category in ffmi_categories:
        if category["lower"] <= target_ffmi <= category["upper"]:
            target_ffmi_category = category["name"]
            break
            
    st.write(f"**Target FMI Category**: {target_fmi_category}")
    st.write(f"**Target FFMI Category**: {target_ffmi_category}")

# Get combined recommendations
current_combo_rec = utils.get_combined_category_rates(current_fmi_category, current_ffmi_category)
target_combo_rec = utils.get_combined_category_rates(target_fmi_category, target_ffmi_category)
current_recommended_category = current_combo_rec.get("recommendation", "No specific recommendation available")
target_recommended_category = target_combo_rec.get("recommendation", "No specific recommendation available")

st.write("#### Recommendations")
st.write(f"**Based on current body composition**: {current_recommended_category}")
st.write(f"**Based on target body composition**: {target_recommended_category}")

# SECTION 4: Set Target Values
st.markdown("---")
st.write("### Set Target Values")

# Create a radio button for target selection method
target_method = st.radio(
    "Choose how you want to set your target:",
    options=["Target Body Fat %", "Target Weight Components"],
    help="Select whether to set your target by body fat percentage or by specific weight components"
)

# Function to safely update target body fat and related values
def update_from_bf(new_bf_pct):
    try:
        # Get current total weight
        total_weight = st.session_state.target_fat + st.session_state.target_ffm
        
        # Update fat mass based on new body fat percentage
        new_fat_mass = total_weight * (new_bf_pct / 100)
        
        # Update fat-free mass to maintain total weight
        new_ffm = total_weight - new_fat_mass
        
        # Store in session state
        st.session_state.target_bf = new_bf_pct
        st.session_state.target_fat = new_fat_mass
        st.session_state.target_ffm = new_ffm
        
        # Calculate and update FMI and FFMI
        height_m = height_cm / 100
        target_fat_kg = new_fat_mass / 2.20462
        target_ffm_kg = new_ffm / 2.20462
        st.session_state.target_fmi = target_fat_kg / (height_m * height_m)
        st.session_state.target_ffmi = target_ffm_kg / (height_m * height_m)
    except Exception as e:
        st.error(f"Error updating values: {e}")

# Target Body Fat % Method
if target_method == "Target Body Fat %":
    st.write("Use the slider to adjust your target body fat percentage:")
    
    # Set reasonable limits for target body fat based on goal type
    try:
        # Create safe values with defaults
        min_target_bf = 3.0
        max_target_bf = 50.0
        
        # Adjust based on goal type
        if goal_type == "Lose fat":
            min_target_bf = max(3.0, current_bf * 0.7)
            max_target_bf = min(50.0, current_bf * 0.99)
        elif goal_type == "Gain muscle":
            min_target_bf = max(3.0, current_bf * 0.9)
            max_target_bf = min(50.0, current_bf * 1.1)
        else:  # Maintain
            min_target_bf = max(3.0, current_bf * 0.9)
            max_target_bf = min(50.0, current_bf * 1.1)
            
        # Ensure values are within reasonable limits
        min_target_bf = float(min_target_bf)
        max_target_bf = float(max_target_bf)
        
        # Make sure min is less than max
        if min_target_bf >= max_target_bf:
            min_target_bf = max(3.0, max_target_bf - 5.0)
            
        # Make sure current value is within range
        current_target_bf = float(st.session_state.target_bf)
        if current_target_bf < min_target_bf:
            current_target_bf = min_target_bf
        if current_target_bf > max_target_bf:
            current_target_bf = max_target_bf
            
        # Display the slider for target body fat percentage
        new_target_bf = st.slider(
            "Target Body Fat Percentage",
            min_value=float(min_target_bf),
            max_value=float(max_target_bf),
            value=float(current_target_bf),
            step=0.5,
            format="%.1f%%",
            help="Drag the slider to set your target body fat percentage"
        )
        
        # Apply button
        if st.button("Apply Target Body Fat %"):
            update_from_bf(new_target_bf)
            st.success("Target body fat percentage updated successfully!")
            # Use st.rerun() which is the current recommended way
            try:
                st.rerun()
            except:
                st.warning("Please refresh the page to see updated values.")
    except Exception as e:
        st.error(f"Error setting target body fat: {e}")
        st.info("Please try setting your target using weight components instead.")

# Target Weight Components Method
else:
    try:
        # Show options for setting specific weight components
        st.write("Set your target weight components:")
        comp_col1, comp_col2 = st.columns(2)
        
        with comp_col1:
            st.write("#### Current Values")
            st.write(f"Current Fat Mass: **{current_fat_mass_lbs:.1f} lbs**")
            st.write(f"Current Fat-Free Mass: **{current_fat_free_mass_lbs:.1f} lbs**")
            st.write(f"Current FMI: **{current_fmi:.1f} kg/m²** ({current_fmi_category})")
            st.write(f"Current FFMI: **{current_ffmi:.1f} kg/m²** ({current_ffmi_category})")
            
        with comp_col2:
            st.write("#### Set Target Values")
            
            # Set default safe values
            fat_mass_min = max(5.0, current_fat_mass_lbs * 0.5)
            fat_mass_max = current_fat_mass_lbs * 1.5
            
            # Adjust based on goal type with safety checks
            try:
                if goal_type == "Lose fat":
                    fat_mass_min = max(5.0, current_fat_mass_lbs * 0.5)
                    fat_mass_max = max(fat_mass_min + 1.0, current_fat_mass_lbs * 0.99)
                elif goal_type == "Gain muscle":
                    fat_mass_min = max(5.0, current_fat_mass_lbs * 0.8)
                    fat_mass_max = max(fat_mass_min + 1.0, current_fat_mass_lbs * 1.2)
                else:  # Maintain
                    fat_mass_min = max(5.0, current_fat_mass_lbs * 0.9)
                    fat_mass_max = max(fat_mass_min + 1.0, current_fat_mass_lbs * 1.1)
                    
                # Ensure current value is within limits
                current_target_fat = float(st.session_state.target_fat)
                if current_target_fat < fat_mass_min:
                    current_target_fat = fat_mass_min
                if current_target_fat > fat_mass_max:
                    current_target_fat = fat_mass_max
                    
                # Target fat mass input
                new_target_fat_mass_lbs = st.number_input(
                    "Target Fat Mass (lbs)",
                    min_value=float(fat_mass_min),
                    max_value=float(fat_mass_max),
                    value=float(current_target_fat),
                    step=0.5,
                    help="Enter your target fat mass in pounds"
                )
            except Exception as e:
                st.warning(f"Could not set fat mass slider: {e}")
                new_target_fat_mass_lbs = current_fat_mass_lbs
            
            # Set default safe values for FFM
            ffm_min = max(50.0, current_fat_free_mass_lbs * 0.8)
            ffm_max = current_fat_free_mass_lbs * 1.2
            
            # Adjust based on goal type with safety checks
            try:
                if goal_type == "Lose fat":
                    ffm_min = max(50.0, current_fat_free_mass_lbs * 0.95)
                    ffm_max = max(ffm_min + 1.0, current_fat_free_mass_lbs * 1.05)
                elif goal_type == "Gain muscle":
                    ffm_min = max(50.0, current_fat_free_mass_lbs * 0.99)
                    ffm_max = max(ffm_min + 1.0, current_fat_free_mass_lbs * 1.1)
                else:  # Maintain
                    ffm_min = max(50.0, current_fat_free_mass_lbs * 0.9)
                    ffm_max = max(ffm_min + 1.0, current_fat_free_mass_lbs * 1.1)
                    
                # Ensure current value is within limits
                current_target_ffm = float(st.session_state.target_ffm)
                if current_target_ffm < ffm_min:
                    current_target_ffm = ffm_min
                if current_target_ffm > ffm_max:
                    current_target_ffm = ffm_max
                    
                # Target FFM input
                new_target_ffm_lbs = st.number_input(
                    "Target Fat-Free Mass (lbs)",
                    min_value=float(ffm_min),
                    max_value=float(ffm_max),
                    value=float(current_target_ffm),
                    step=0.5,
                    help="Enter your target fat-free mass in pounds"
                )
            except Exception as e:
                st.warning(f"Could not set fat-free mass slider: {e}")
                new_target_ffm_lbs = current_fat_free_mass_lbs
            
            # Calculate resulting body fat percentage
            resulting_weight = new_target_fat_mass_lbs + new_target_ffm_lbs
            resulting_bf_pct = (new_target_fat_mass_lbs / resulting_weight) * 100
            st.write(f"Resulting Body Fat: **{resulting_bf_pct:.1f}%**")
            
            # Calculate resulting FMI and FFMI
            height_m = height_cm / 100
            resulting_fat_kg = new_target_fat_mass_lbs / 2.20462
            resulting_ffm_kg = new_target_ffm_lbs / 2.20462
            resulting_fmi = resulting_fat_kg / (height_m * height_m)
            resulting_ffmi = resulting_ffm_kg / (height_m * height_m)
            
            # Show resulting indices
            st.write(f"Resulting FMI: **{resulting_fmi:.1f} kg/m²**")
            st.write(f"Resulting FFMI: **{resulting_ffmi:.1f} kg/m²**")
            
            # Apply button
            if st.button("Apply Target Weight Components"):
                st.session_state.target_fat = new_target_fat_mass_lbs
                st.session_state.target_ffm = new_target_ffm_lbs
                st.session_state.target_bf = resulting_bf_pct
                st.session_state.target_fmi = resulting_fmi
                st.session_state.target_ffmi = resulting_ffmi
                st.success("Target weight components updated successfully!")
                # Use st.rerun() which is the current recommended way
                try:
                    st.rerun()
                except:
                    st.warning("Please refresh the page to see updated values.")
    except Exception as e:
        st.error(f"Error setting target weight components: {e}")
        st.info("Please try setting your target using body fat percentage instead.")

# Display composition category information
height_m = height_cm / 100
target_fat_kg = st.session_state.target_fat / 2.20462
target_ffm_kg = st.session_state.target_ffm / 2.20462
target_fmi = target_fat_kg / (height_m * height_m)
target_ffmi = target_ffm_kg / (height_m * height_m)

# Find target categories
target_fmi_category = "Unknown"
for category in fmi_categories:
    if category["lower"] <= target_fmi <= category["upper"]:
        target_fmi_category = category["name"]
        break

target_ffmi_category = "Unknown"
for category in ffmi_categories:
    if category["lower"] <= target_ffmi <= category["upper"]:
        target_ffmi_category = category["name"]
        break

# Show categories and recommendations
with st.expander("Body Composition Index Categories"):
    st.write("#### Target Categories")
    st.write(f"Target FMI: **{target_fmi:.1f} kg/m²** ({target_fmi_category})")
    st.write(f"Target FFMI: **{target_ffmi:.1f} kg/m²** ({target_ffmi_category})")
    
    # Calculate the new combo recommendation
    combo_rec = utils.get_combined_category_rates(target_fmi_category, target_ffmi_category)
    target_recommended_category = combo_rec.get("recommendation", "No specific recommendation available")
    
    st.write(f"**Recommendation based on target body composition**: {target_recommended_category}")

# Calculate target weight from fat mass and FFM
target_weight_lbs = target_fat_mass_lbs + target_ffm_lbs

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

# Identify the appropriate recommended rates with error handling
try:
    # Make sure workout_frequency is a string for safety
    workout_freq = st.session_state.user_info.get("workouts_per_week", "3-4")
    if workout_freq is not None and not isinstance(workout_freq, str):
        workout_freq = str(workout_freq)
    
    recommended_rates = utils.calculate_recommended_rate({
        "goal_type": goal_type,
        "fmi_category": current_fmi_category,
        "ffmi_category": current_ffmi_category,
        "commitment_level": st.session_state.user_info.get("commitment_level", "Moderate"),
        "activity_level": st.session_state.user_info.get("activity_level", "Lightly Active"),
        "workout_frequency": workout_freq,
        "performance_preference": st.session_state.user_info.get("performance_preference", "Balance"),
        "body_comp_tradeoff": st.session_state.user_info.get("body_comp_tradeoff", "Balance"),
    }, goal_type_code)
except Exception as e:
    # Default values if calculation fails
    recommended_rates = {
        "weekly_weight_pct": 0.005,
        "weekly_fat_pct": 0.8
    }
    st.warning(f"Using default recommended rates due to calculation error.")

recommended_weekly_pct = recommended_rates.get("weekly_weight_pct", 0.005)
recommended_fat_pct = recommended_rates.get("weekly_fat_pct", 0.8)

# SECTION 5: Set Rate and Timeline
st.markdown("---")
st.write("### Set Rate and Timeline")

rate_col1, rate_col2, rate_col3 = st.columns(3)

with rate_col1:
    # Weekly rate as percentage of body weight
    weekly_weight_pct_options = [0.0025, 0.005, 0.0075, 0.01, 0.0125]
    weekly_weight_pct_labels = ["0.25%", "0.50%", "0.75%", "1.00%", "1.25%"]
    
    # Find closest recommended rate
    closest_idx = min(range(len(weekly_weight_pct_options)), 
                     key=lambda i: abs(weekly_weight_pct_options[i] - recommended_weekly_pct))
    
    weekly_weight_pct = st.select_slider(
        "Weekly Rate (% of current weight)",
        options=weekly_weight_pct_options,
        format_func=lambda x: weekly_weight_pct_labels[weekly_weight_pct_options.index(x)],
        value=weekly_weight_pct_options[closest_idx],
        help="Slower rates are generally better for preserving muscle during fat loss and minimizing fat gain during muscle building."
    )
    
    # Calculate absolute weekly change in pounds
    weekly_change_lbs = current_weight_lbs * weekly_weight_pct
    
    if goal_type == "Lose fat":
        st.write(f"You will lose approximately **{weekly_change_lbs:.1f} lbs per week**")
    elif goal_type == "Gain muscle":
        st.write(f"You will gain approximately **{weekly_change_lbs:.1f} lbs per week**")
    else:
        st.write("Your weight will remain relatively stable")

with rate_col2:
    # Percentage of weight change as fat vs. muscle
    if goal_type == "Lose fat":
        weekly_fat_pct_options = [0.5, 0.6, 0.7, 0.8, 0.9, 1.0]
        weekly_fat_pct_labels = ["50%", "60%", "70%", "80%", "90%", "100%"]
        weekly_fat_pct_label = "Percentage of Weight Loss as Fat"
        
        # Explanation
        fat_pct_explanation = "Higher percentages mean you preserve more muscle while losing fat."
    elif goal_type == "Gain muscle":
        weekly_fat_pct_options = [0.0, 0.1, 0.2, 0.3, 0.4, 0.5]
        weekly_fat_pct_labels = ["0%", "10%", "20%", "30%", "40%", "50%"]
        weekly_fat_pct_label = "Percentage of Weight Gain as Fat"
        
        # Explanation
        fat_pct_explanation = "Lower percentages mean more of your weight gain is muscle rather than fat."
    else:  # Maintain
        weekly_fat_pct_options = [0.0]
        weekly_fat_pct_labels = ["0%"]
        weekly_fat_pct_label = "Body Composition Change"
        
        # Explanation
        fat_pct_explanation = "In maintenance, your overall weight stays stable but you may still have small body composition changes."
    
    # Find closest recommended fat percentage
    if len(weekly_fat_pct_options) > 1:
        closest_fat_idx = min(range(len(weekly_fat_pct_options)), 
                             key=lambda i: abs(weekly_fat_pct_options[i] - recommended_fat_pct))
        default_fat_pct = weekly_fat_pct_options[closest_fat_idx]
    else:
        default_fat_pct = weekly_fat_pct_options[0]
    
    weekly_fat_pct = st.select_slider(
        weekly_fat_pct_label,
        options=weekly_fat_pct_options,
        format_func=lambda x: weekly_fat_pct_labels[weekly_fat_pct_options.index(x)],
        value=default_fat_pct,
        help=fat_pct_explanation
    )
    
    # Calculate the fat and muscle changes per week
    if goal_type == "Lose fat":
        weekly_fat_change_lbs = -weekly_change_lbs * weekly_fat_pct
        weekly_muscle_change_lbs = -weekly_change_lbs * (1 - weekly_fat_pct)
        st.write(f"Fat loss: **{-weekly_fat_change_lbs:.1f} lbs/week**, Muscle loss: **{-weekly_muscle_change_lbs:.1f} lbs/week**")
    elif goal_type == "Gain muscle":
        weekly_fat_change_lbs = weekly_change_lbs * weekly_fat_pct
        weekly_muscle_change_lbs = weekly_change_lbs * (1 - weekly_fat_pct)
        st.write(f"Muscle gain: **{weekly_muscle_change_lbs:.1f} lbs/week**, Fat gain: **{weekly_fat_change_lbs:.1f} lbs/week**")
    else:
        st.write("Body composition changes will be minimal")

with rate_col3:
    # Predict the number of weeks to reach target
    if goal_type != "Maintain current composition":
        predicted_weeks = utils.calculate_predicted_weeks(
            current_weight_kg, 
            target_weight_lbs / 2.20462,
            current_bf,
            target_bf,
            weekly_weight_pct,
            weekly_fat_pct,
            goal_type_code
        )
        
        if predicted_weeks is not None:
            # Set a reasonable maximum of 52 weeks for the timeline selection
            max_timeline = min(52, int(predicted_weeks * 1.5))
            
            # Allow user to select timeline up to the maximum
            timeline_weeks = st.slider(
                "Timeline (weeks)",
                min_value=4,
                max_value=max_timeline,
                value=min(int(predicted_weeks), max_timeline),
                step=1,
                help="Select the number of weeks for your transformation"
            )
            
            # Calculate end date
            start_date = datetime.now().date()
            end_date = start_date + timedelta(weeks=timeline_weeks)
            
            st.write(f"Projected completion date: **{end_date.strftime('%B %d, %Y')}**")
        else:
            st.error("Unable to calculate the predicted timeline. This might be due to inconsistent target values.")
            timeline_weeks = st.slider(
                "Timeline (weeks)",
                min_value=4,
                max_value=26,
                value=12,
                step=1,
                help="Select the number of weeks for your transformation"
            )
    else:
        timeline_weeks = st.slider(
            "Timeline (weeks)",
            min_value=4,
            max_value=26,
            value=12,
            step=1,
            help="Select the number of weeks for maintaining your body composition"
        )
        
        # Calculate end date for maintenance
        start_date = datetime.now().date()
        end_date = start_date + timedelta(weeks=timeline_weeks)
        
        st.write(f"Maintenance period ends: **{end_date.strftime('%B %d, %Y')}**")

# SECTION 6: Generate detailed weekly progress table
st.markdown("---")
st.write("### Detailed Weekly Progress")

if st.button("Generate Detailed Progress Table"):
    # Convert to required units
    height_cm = st.session_state.user_info['height_cm']
    age = st.session_state.user_info['age']
    gender = st.session_state.user_info['gender']
    tdee = st.session_state.nutrition_plan.get('tdee', 2000)  # Default TDEE if not set
    
    # Generate the table
    progress_df = utils.generate_detailed_progress_table(
        current_weight_lbs,
        current_bf,
        target_weight_lbs,
        target_bf,
        weekly_weight_pct,
        weekly_fat_pct,
        timeline_weeks,
        datetime.now().date().strftime('%Y-%m-%d'),
        tdee,
        gender,
        age,
        height_cm
    )
    
    # Display the table
    st.dataframe(progress_df)

# Save button
with st.form(key="save_goal_form"):
    st.write("### Save Your Goal Settings")
    
    # Calculate values to save
    weekly_weight_lbs = current_weight_lbs * weekly_weight_pct
    
    # Apply the sign based on goal type
    if goal_type == "Lose fat":
        weekly_weight_lbs = -weekly_weight_lbs
    elif goal_type == "Maintain current composition":
        weekly_weight_lbs = 0
    
    # Prepare data for saving
    goal_data = {
        "goal_type": goal_type_code,
        "current_weight_lbs": current_weight_lbs,
        "current_bf": current_bf,
        "current_fat_mass_lbs": current_fat_mass_lbs,
        "current_ffm_lbs": current_fat_free_mass_lbs,
        "target_weight_lbs": target_weight_lbs,
        "target_bf": target_bf,
        "target_fat_mass_lbs": target_fat_mass_lbs,
        "target_ffm_lbs": target_ffm_lbs,
        "weekly_weight_pct": weekly_weight_pct,
        "weekly_fat_pct": weekly_fat_pct,
        "weekly_weight_lbs": weekly_weight_lbs,
        "timeline_weeks": timeline_weeks,
        "start_date": datetime.now().date().strftime('%Y-%m-%d'),
        "current_fmi": current_fmi,
        "current_ffmi": current_ffmi,
        "target_fmi": target_fmi,
        "target_ffmi": target_ffmi
    }
    
    # Submit button
    submitted = st.form_submit_button("Save Goal Settings")
    
    if submitted:
        # Update the session state
        st.session_state.goal_info.update(goal_data)
        
        # Save the data
        utils.save_data()
        
        st.success("""
        Goal settings saved successfully! Your targets will be used to:
        
        1. Calculate your nutrition plan macros and calories
        2. Track your progress against these targets
        3. Provide weekly adjustment recommendations
        
        Next, visit the Nutrition Plan page to see your recommended calories and macros.
        """)
        
        # Add a button to navigate to the Nutrition Plan page
        st.link_button("Go to Nutrition Plan", url="Nutrition_Plan")