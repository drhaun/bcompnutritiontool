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
from session_manager import add_session_controls, save_on_change
from progress_summary import show_progress_summary

# Initialize session state variables
if "targets_set" not in st.session_state:
    st.session_state.targets_set = False

# Initialize target values to prevent AttributeError
if "target_fat" not in st.session_state:
    st.session_state.target_fat = 0.0
if "target_ffm" not in st.session_state:
    st.session_state.target_ffm = 0.0
if "target_weight" not in st.session_state:
    st.session_state.target_weight = 0.0
if "target_bf" not in st.session_state:
    st.session_state.target_bf = 0.0
if "target_fmi" not in st.session_state:
    st.session_state.target_fmi = 0.0
if "target_ffmi" not in st.session_state:
    st.session_state.target_ffmi = 0.0

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
    {"name": "Undermuscled", "lower": 0, "upper": 16, 
     "gain_rate": 0.0075, "gain_fat_pct": 0.10, "loss_rate": None, "loss_fat_pct": None},
    {"name": "Moderately Undermuscled", "lower": 16.01, "upper": 18, 
     "gain_rate": 0.0050, "gain_fat_pct": 0.10, "loss_rate": 0.0, "loss_fat_pct": 0.50},
    {"name": "Normal/Healthy", "lower": 18.01, "upper": 22, 
     "gain_rate": 0.0025, "gain_fat_pct": 0.50, "loss_rate": 0.01, "loss_fat_pct": 0.80},
    {"name": "Muscular", "lower": 22.01, "upper": 25, 
     "gain_rate": 0.0025, "gain_fat_pct": 0.50, "loss_rate": 0.01, "loss_fat_pct": 0.80},
    {"name": "Very Muscular", "lower": 25.01, "upper": 27, 
     "gain_rate": 0.0025, "gain_fat_pct": 0.50, "loss_rate": 0.01, "loss_fat_pct": 0.80},
    {"name": "Extremely Muscular", "lower": 27.01, "upper": 50, 
     "gain_rate": 0.0025, "gain_fat_pct": 0.50, "loss_rate": 0.01, "loss_fat_pct": 0.80}
]

# Set page title and layout
st.set_page_config(
    page_title="Fitomics - Body Composition Goals",
    page_icon="💪",
    layout="wide"
)

# Header
try:
    st.image("images/fitomicshorizontalgold.png", width=300)
except:
    st.title("Fitomics")
st.title("Body Composition Goals")
st.markdown("Define your body composition targets and timeline.")

# Add session management controls
add_session_controls()

# Check if initial setup is complete, otherwise redirect
if "user_info" not in st.session_state or not st.session_state.user_info:
    st.error("Please complete the Initial Setup first.")
    st.stop()

# Initialize session state variables with user_info if available
if "user_info" in st.session_state:
    # Get values directly from user_info dictionary which contains the latest data
    gender = st.session_state.user_info.get('gender', "Male")
    age = st.session_state.user_info.get('age', 30)
    height_cm = st.session_state.user_info.get('height_cm', 175)
    weight_kg = st.session_state.user_info.get('weight_kg', 75)
    body_fat_pct = st.session_state.user_info.get('body_fat_percentage', 15)
    # Allow user to change goal type on this page and force refresh when changed
    goal_type = st.selectbox(
        "Select your body composition goal:",
        options=["Lose fat", "Build muscle", "Maintain body composition/Support performance"],
        index=0 if st.session_state.user_info.get('goal_focus') == "Lose fat" else 
              1 if st.session_state.user_info.get('goal_focus') == "Build muscle" else
              2 if st.session_state.user_info.get('goal_focus') == "Maintain body composition/Support performance" else 0,
        key="goal_type_selector"
    )
    
    # Force refresh when goal type changes to update calculations
    if "last_body_comp_goal" not in st.session_state:
        st.session_state.last_body_comp_goal = goal_type
    elif st.session_state.last_body_comp_goal != goal_type:
        st.session_state.last_body_comp_goal = goal_type
        # Update user_info to reflect the change
        st.session_state.user_info['goal_focus'] = goal_type
        st.rerun()
    activity_level = st.session_state.user_info.get('activity_level', "Moderately active")
    tdee = st.session_state.user_info.get('tdee', 2500)
    
    # Update session state with these values to ensure consistency
    st.session_state.gender = gender
    st.session_state.age = age
    st.session_state.height_cm = height_cm
    st.session_state.weight_kg = weight_kg
    st.session_state.body_fat_pct = body_fat_pct
    st.session_state.goal_type = goal_type
    st.session_state.activity_level = activity_level
    st.session_state.tdee = tdee
else:
    # Fall back to defaults or existing session state values
    if "gender" not in st.session_state:
        st.session_state.gender = "Male"
    if "age" not in st.session_state:
        st.session_state.age = 30
    if "height_cm" not in st.session_state:
        st.session_state.height_cm = 175
    if "weight_kg" not in st.session_state:
        st.session_state.weight_kg = 75
    if "body_fat_pct" not in st.session_state:
        st.session_state.body_fat_pct = 15
    if "goal_type" not in st.session_state:
        st.session_state.goal_type = "Lose fat"
    if "activity_level" not in st.session_state:
        st.session_state.activity_level = "Moderately active"
    if "tdee" not in st.session_state:
        st.session_state.tdee = 2500

# Load data from session state with default values to prevent NoneType errors
gender = st.session_state.get('gender', 'Male')
age = st.session_state.get('age', 30)
height_cm = st.session_state.get('height_cm', 175)
weight_kg = st.session_state.get('weight_kg', 75)  # Use get with default value
weight_lbs = weight_kg * 2.20462 if weight_kg is not None else 0

# Debug weight values to troubleshoot
if "user_info" in st.session_state:
    weight_kg = st.session_state.user_info.get('weight_kg', 0) or 0
    weight_lbs = st.session_state.user_info.get('weight_lbs', 0) or 0
    session_weight = getattr(st.session_state, 'weight_kg', 0) or 0
    
    st.sidebar.write("#### Debug User Info")
    st.sidebar.write(f"User Info Weight: {weight_kg:.2f} kg = {weight_kg * 2.20462:.2f} lbs")
    st.sidebar.write(f"User Info Weight (lbs): {weight_lbs:.2f} lbs")
    st.sidebar.write(f"Session state weight: {session_weight:.2f} kg = {session_weight * 2.20462:.2f} lbs")

body_fat_pct = st.session_state.body_fat_pct
goal_type = st.session_state.goal_type
activity_level = st.session_state.activity_level
tdee = st.session_state.tdee

# SECTION 1: Current Body Composition Summary
st.write("### Current Body Composition")

# Calculate current body composition values - get weight from session state directly
current_weight_lbs = (st.session_state.get('weight_kg', 0) or 0) * 2.20462  # Force direct calculation
current_bf = body_fat_pct
current_fat_mass_lbs = current_weight_lbs * (current_bf / 100)
current_fat_free_mass_lbs = current_weight_lbs - current_fat_mass_lbs

# Debug weight values - display in sidebar for troubleshooting
with st.sidebar:
    st.write("### Debug Weight Info")
    st.write(f"Session state weight: {st.session_state.weight_kg:.2f} kg = {st.session_state.weight_kg * 2.20462:.2f} lbs")
    st.write(f"Current weight in analysis: {current_weight_lbs:.2f} lbs")

# Calculate FMI and FFMI
height_m = height_cm / 100
current_fat_mass_kg = current_fat_mass_lbs / 2.20462
current_ffm_kg = current_fat_free_mass_lbs / 2.20462
current_fmi = current_fat_mass_kg / (height_m * height_m)
current_ffmi = current_ffm_kg / (height_m * height_m)
current_normalized_ffmi = current_ffmi * (1.8 / height_m)

# Find categories for current values with improved boundary handling
current_fmi_category = "Unknown"
for category in fmi_categories:
    # Handle boundary cases more robustly - use inclusive comparison
    if current_fmi >= category["lower"] and current_fmi <= category["upper"]:
        current_fmi_category = category["name"]
        break

# Fallback check for edge cases where value might be exactly on boundaries
if current_fmi_category == "Unknown":
    for category in fmi_categories:
        # Check with small tolerance for floating point precision
        if (current_fmi >= category["lower"] - 0.05) and (current_fmi <= category["upper"] + 0.05):
            current_fmi_category = category["name"]
            break

current_ffmi_category = "Unknown"
for category in ffmi_categories:
    if current_ffmi >= category["lower"] and current_ffmi <= category["upper"]:
        current_ffmi_category = category["name"]
        break

# Fallback check for FFMI edge cases
if current_ffmi_category == "Unknown":
    for category in ffmi_categories:
        if (current_ffmi >= category["lower"] - 0.05) and (current_ffmi <= category["upper"] + 0.05):
            current_ffmi_category = category["name"]
            break

# Display current body composition in a well-formatted table with categories
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
    ],
    'Category': [
        '-',
        '-', 
        '-', 
        '-',
        current_fmi_category,
        current_ffmi_category,
        '-'
    ]
}

# Display as dataframe
comp_df = pd.DataFrame(comp_data)
st.dataframe(comp_df, use_container_width=True)

# SECTION 2: Target Body Composition Planning
st.write("### Target Body Composition Planning")
st.write("Set your goals for body composition changes. Use the reference information below to guide your target selection.")

# Reference sections moved here to help guide target setting


# Initialize target session state variables if needed
if "target_bf" not in st.session_state:
    # Initialize with placeholder values (current values)
    st.session_state.target_bf = current_bf
    st.session_state.target_fat = current_fat_mass_lbs
    st.session_state.target_ffm = current_fat_free_mass_lbs
    st.session_state.target_fmi = current_fmi
    st.session_state.target_ffmi = current_ffmi
    st.session_state.target_weight = current_weight_lbs

# SECTION 4: Set Target Values
st.markdown("---")
st.write("### Set Target Values")

# Function to update targets and calculate body fat
def update_weight_components():
    try:
        # Get target fat and ffm from session state
        target_fat_mass = st.session_state.target_fat
        target_ffm = st.session_state.target_ffm
        
        # Calculate total weight and body fat percentage
        total_weight = target_fat_mass + target_ffm
        target_bf_pct = (target_fat_mass / total_weight) * 100 if total_weight > 0 else 0
        
        # Store in session state
        st.session_state.target_bf = target_bf_pct
        
        # Calculate and update FMI and FFMI
        height_m = height_cm / 100
        target_fat_kg = target_fat_mass / 2.20462
        target_ffm_kg = target_ffm / 2.20462
        st.session_state.target_fmi = target_fat_kg / (height_m * height_m)
        st.session_state.target_ffmi = target_ffm_kg / (height_m * height_m)
        
        # Set flag that target values have been set
        st.session_state.targets_set = True
    except Exception as e:
        st.error(f"Error updating values: {e}")

# Add explanation about setting component targets
st.write("""
#### Setting Your Body Composition Targets
Use the controls below to set your target fat mass and fat-free mass. The body fat percentage will be 
automatically calculated based on these values. This approach gives you precise control over your body composition goals.
""")

# Show current values in a column
col1, col2 = st.columns(2)

with col1:
    st.write("#### Current Values")
    st.write(f"Current Fat Mass: **{current_fat_mass_lbs:.1f} lbs**")
    st.write(f"Current Fat-Free Mass: **{current_fat_free_mass_lbs:.1f} lbs**")
    st.write(f"Current Body Fat: **{current_bf:.1f}%**")
    st.write(f"Current FMI: **{current_fmi:.1f} kg/m²** ({current_fmi_category})")
    st.write(f"Current FFMI: **{current_ffmi:.1f} kg/m²** ({current_ffmi_category})")

# Show target inputs in the second column
with col2:
    st.write("#### Set Target Values")
    
    # Set default safe values for fat mass
    fat_mass_min = max(5.0, current_fat_mass_lbs * 0.5)
    fat_mass_max = current_fat_mass_lbs * 1.5
    
    # Adjust based on goal type with safety checks
    try:
        if goal_type == "Lose fat":
            fat_mass_min = max(5.0, current_fat_mass_lbs * 0.5)
            fat_mass_max = max(fat_mass_min + 1.0, current_fat_mass_lbs * 0.99)
        elif goal_type == "Build muscle":
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
            help="Set your target fat mass in pounds"
        )
    except Exception as e:
        st.error(f"Error setting fat mass options: {e}")
        new_target_fat_mass_lbs = current_fat_mass_lbs
    
    # FFM range settings
    ffm_min = max(70.0, current_fat_free_mass_lbs * 0.9)
    ffm_max = current_fat_free_mass_lbs * 1.2
    
    # Adjust based on goal type with safety checks
    try:
        if goal_type == "Lose fat":
            ffm_min = max(70.0, current_fat_free_mass_lbs * 0.95)
            ffm_max = max(ffm_min + 1.0, current_fat_free_mass_lbs * 1.05)
        elif goal_type == "Build muscle":
            ffm_min = max(70.0, current_fat_free_mass_lbs * 0.99)
            ffm_max = max(ffm_min + 1.0, current_fat_free_mass_lbs * 1.2)
        else:  # Maintain
            ffm_min = max(70.0, current_fat_free_mass_lbs * 0.95)
            ffm_max = max(ffm_min + 1.0, current_fat_free_mass_lbs * 1.05)
            
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
            help="Set your target fat-free mass in pounds"
        )
    except Exception as e:
        st.error(f"Error setting FFM options: {e}")
        new_target_ffm_lbs = current_fat_free_mass_lbs

    # Display calculated results
    st.write("#### Calculated Results")
    
    # Calculate resulting weight and body fat percentage
    resulting_weight = new_target_fat_mass_lbs + new_target_ffm_lbs
    st.write(f"Total Weight: **{resulting_weight:.1f} lbs**")
    
    resulting_bf_pct = (new_target_fat_mass_lbs / resulting_weight) * 100
    
    # Add body fat percentage with reference photo button
    bf_result_col1, bf_result_col2 = st.columns([3, 1])
    with bf_result_col1:
        st.write(f"Body Fat: **{resulting_bf_pct:.1f}%**")
    with bf_result_col2:
        if st.button("📷 BF Reference", key="bf_ref_calc", help="View body fat percentage reference photos"):
            st.session_state.show_bf_reference_calc = True
            st.rerun()
    
    # Calculate resulting FMI and FFMI
    height_m = height_cm / 100
    resulting_fat_kg = new_target_fat_mass_lbs / 2.20462
    resulting_ffm_kg = new_target_ffm_lbs / 2.20462
    resulting_fmi = resulting_fat_kg / (height_m * height_m)
    resulting_ffmi = resulting_ffm_kg / (height_m * height_m)
    
    # Show resulting indices with category descriptors and help buttons
    
    # FMI display with info button
    fmi_col1, fmi_col2 = st.columns([3, 1])
    with fmi_col1:
        st.write(f"FMI: **{resulting_fmi:.1f}**")
    with fmi_col2:
        if st.button("ℹ️ FMI Info", key="fmi_info_calc", help="Learn about Fat Mass Index"):
            st.session_state.show_fmi_info = True
            st.rerun()
    
    # FFMI display with info button
    ffmi_col1, ffmi_col2 = st.columns([3, 1])
    with ffmi_col1:
        st.write(f"FFMI: **{resulting_ffmi:.1f}**")
    with ffmi_col2:
        if st.button("ℹ️ FFMI Info", key="ffmi_info_calc", help="Learn about Fat-Free Mass Index"):
            st.session_state.show_ffmi_info = True
            st.rerun()
    
    # Determine FMI category with improved boundary handling
    fmi_category = "Unknown"
    fmi_color = "gray"
    for category in fmi_categories:
        if resulting_fmi >= category["lower"] and resulting_fmi <= category["upper"]:
            fmi_category = category["name"]
            # Set colors based on category for visual guidance
            if "Lean" in fmi_category or "Healthy" in fmi_category:
                fmi_color = "green"
            elif "Slightly" in fmi_category:
                fmi_color = "orange"
            elif "Overfat" in fmi_category:
                fmi_color = "red"
            elif "Extremely" in fmi_category:
                fmi_color = "violet"
            break
    
    # Fallback for FMI edge cases
    if fmi_category == "Unknown":
        for category in fmi_categories:
            if (resulting_fmi >= category["lower"] - 0.05) and (resulting_fmi <= category["upper"] + 0.05):
                fmi_category = category["name"]
                if "Lean" in fmi_category or "Healthy" in fmi_category:
                    fmi_color = "green"
                elif "Slightly" in fmi_category:
                    fmi_color = "orange"
                elif "Overfat" in fmi_category:
                    fmi_color = "red"
                elif "Extremely" in fmi_category:
                    fmi_color = "violet"
                break
    
    # Determine FFMI category with improved boundary handling
    ffmi_category = "Unknown"
    ffmi_color = "gray"
    for category in ffmi_categories:
        if resulting_ffmi >= category["lower"] and resulting_ffmi <= category["upper"]:
            ffmi_category = category["name"]
            # Set colors based on category for visual guidance
            if "Normal" in ffmi_category or "Muscular" in ffmi_category:
                ffmi_color = "green"
            elif "Moderately" in ffmi_category:
                ffmi_color = "orange"
            elif "Under" in ffmi_category:
                ffmi_color = "red"
            elif "Very" in ffmi_category or "Extremely" in ffmi_category:
                ffmi_color = "blue"
            break
    
    # Fallback for FFMI edge cases
    if ffmi_category == "Unknown":
        for category in ffmi_categories:
            if (resulting_ffmi >= category["lower"] - 0.05) and (resulting_ffmi <= category["upper"] + 0.05):
                ffmi_category = category["name"]
                if "Normal" in ffmi_category or "Muscular" in ffmi_category:
                    ffmi_color = "green"
                elif "Moderately" in ffmi_category:
                    ffmi_color = "orange"
                elif "Under" in ffmi_category:
                    ffmi_color = "red"
                elif "Very" in ffmi_category or "Extremely" in ffmi_category:
                    ffmi_color = "blue"
                break
    
    # Display with category indicators and visual guidance
    col1, col2 = st.columns(2)
    
    with col1:
        st.write(f"**FMI:** {resulting_fmi:.1f} kg/m²")
        st.markdown(f":{fmi_color}[**{fmi_category}**]")
        # Add a simple visual guide
        if fmi_color == "green":
            st.success("Healthy range")
        elif fmi_color == "orange":
            st.warning("Moderate range")
        elif fmi_color == "red":
            st.error("High range")
        elif fmi_color == "violet":
            st.error("Very high range")
    
    with col2:
        st.write(f"**FFMI:** {resulting_ffmi:.1f} kg/m²")
        st.markdown(f":{ffmi_color}[**{ffmi_category}**]")
        # Add a simple visual guide
        if ffmi_color == "green":
            st.success("Good muscle mass")
        elif ffmi_color == "orange":
            st.warning("Below average")
        elif ffmi_color == "red":
            st.error("Low muscle mass")
        elif ffmi_color == "blue":
            st.info("High muscle mass")
    
    # Apply button - uses the updated st.rerun() approach for seamless updates
    if st.button("Set Body Composition Targets"):
        # Save all values to session state
        st.session_state.target_fat = new_target_fat_mass_lbs
        st.session_state.target_ffm = new_target_ffm_lbs
        st.session_state.target_bf = resulting_bf_pct
        st.session_state.target_fmi = resulting_fmi
        st.session_state.target_ffmi = resulting_ffmi
        st.session_state.targets_set = True
        
        # Also save results to goal_info to ensure persistence
        if "goal_info" not in st.session_state:
            st.session_state.goal_info = {}
        
        st.session_state.goal_info["target_fat_mass_lbs"] = new_target_fat_mass_lbs
        st.session_state.goal_info["target_ffm_lbs"] = new_target_ffm_lbs
        st.session_state.goal_info["target_body_fat"] = resulting_bf_pct
        st.session_state.goal_info["target_fmi"] = resulting_fmi
        st.session_state.goal_info["target_ffmi"] = resulting_ffmi
        
        # Use the modern rerun method to refresh the page
        st.rerun()

# Add information panels below the Set Target Values section
st.markdown("---")

# Body Fat Reference Photos Panel
if st.session_state.get('show_bf_reference_calc', False):
    st.markdown("### Body Fat Percentage Visual Reference")
    st.markdown("Use these reference photos to help understand how different body fat percentages look.")
    
    ref_photo_path = "images/ref_photos.jpg"
    if os.path.exists(ref_photo_path):
        st.image(ref_photo_path, caption="Body Fat Percentage Reference - Men (top) and Women (bottom)", use_container_width=True)
    else:
        alt_path = "attached_assets/ref_photos.jpg"
        if os.path.exists(alt_path):
            st.image(alt_path, caption="Body Fat Percentage Reference", use_container_width=True)
        else:
            st.warning("Reference photos not available.")
    
    if st.button("Close Reference Photos", key="close_bf_ref"):
        st.session_state.show_bf_reference_calc = False
        st.rerun()

# FMI Information Panel
if st.session_state.get('show_fmi_info', False):
    st.markdown("### Fat Mass Index (FMI) Explained")
    st.markdown("""
    **What it is**: FMI measures the amount of fat mass relative to height squared (kg/m²).
    
    **Why it matters**: FMI helps classify body fat levels independent of muscle mass, giving a clearer picture of fat-related health risks.
    
    **Interpretation**:
    - **Below 2**: Extremely low fat (potentially unhealthy)
    - **2-5**: Lean 
    - **5-7**: Healthy/Athletic (varies by gender)
    - **7-9**: Slightly overfat
    - **9-13**: Overfat
    - **Above 13**: Significantly overfat
    
    Different recommendations apply based on your FMI category. For example, those in higher FMI categories may benefit from focusing on fat loss, while those in lower categories may need to maintain or even increase fat mass.
    """)
    
    if st.button("Close FMI Information", key="close_fmi_info"):
        st.session_state.show_fmi_info = False
        st.rerun()

# FFMI Information Panel
if st.session_state.get('show_ffmi_info', False):
    st.markdown("### Fat-Free Mass Index (FFMI) Explained")
    st.markdown("""
    **What it is**: FFMI measures the amount of fat-free mass (muscle, bone, organs) relative to height squared (kg/m²).
    
    **Why it matters**: FFMI helps assess muscularity independent of body fat, giving a clearer picture of muscle development.
    
    **Interpretation**:
    - **Below 16**: Undermuscled
    - **16-18**: Moderately undermuscled
    - **18-22**: Normal/healthy
    - **22-25**: Muscular
    - **25-27**: Very muscular (approaching genetic potential for most)
    - **Above 27**: Extremely muscular (rare without PEDs)
    
    **Normalized FFMI** adjusts the score to account for height differences, as taller individuals naturally have lower FFMI values.
    
    Different recommendations apply based on your FFMI category. For example, those in lower FFMI categories may benefit from focusing on muscle gain.
    """)
    
    # Add advice about combined categories
    st.markdown("#### Combined FMI + FFMI Guidance")
    st.markdown("""
    The combination of your FMI and FFMI categories provides a comprehensive picture of your body composition status.
    
    **General Patterns:**
    - If your FMI is high and FFMI is low: Focus on losing fat while gaining muscle
    - If your FMI is high and FFMI is average: Focus on losing fat while maintaining muscle
    - If your FMI is low or average and FFMI is low: Focus on building muscle
    - If your FMI is low and FFMI is high: Consider maintenance or a slight surplus for performance
    - If your FMI is high and FFMI is high: Consider body recomposition (lose fat while maintaining muscle)
    """)
    
    if st.button("Close FFMI Information", key="close_ffmi_info"):
        st.session_state.show_ffmi_info = False
        st.rerun()

# Initialize target variables with default values
target_bf = current_bf
target_fat_mass_lbs = current_fat_mass_lbs
target_ffm_lbs = current_fat_free_mass_lbs
target_fmi = current_fmi
target_ffmi = current_ffmi
target_weight_lbs = current_weight_lbs

# Get target values from session state if targets have been set
if st.session_state.targets_set:
    # Get values from session state
    target_bf = st.session_state.target_bf
    target_fat_mass_lbs = st.session_state.target_fat
    target_ffm_lbs = st.session_state.target_ffm
    target_fmi = st.session_state.target_fmi
    target_ffmi = st.session_state.target_ffmi
    
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
    
    # Display target information only if targets have been set
    # Show categories but without targets and recommendations
    with st.expander("Body Composition Index Categories"):
        st.write("Categories are based on your current measurements.")
        
        # Calculate target weight from fat mass and FFM
        target_weight_lbs = target_fat_mass_lbs + target_ffm_lbs
        target_normalized_ffmi = target_ffmi * (1.8 / height_m)

    # Success message with guidance for next steps
    st.write("### Target Body Composition Set")
    success_col1, success_col2 = st.columns([3, 1])
    
    with success_col1:
        st.success("Your target body composition values have been set! Continue to the Timeline section below.")
    
    with success_col2:
        # Add a button that will scroll to the timeline section
        st.markdown("""
        <a href="#timeline_section" style="text-decoration: none;">
            <button style="background-color: #4CAF50; color: white; padding: 10px 15px; 
            border: none; border-radius: 4px; cursor: pointer; width: 100%;">
                Continue to Timeline ↓
            </button>
        </a>
        """, unsafe_allow_html=True)
else:
    st.write("### Target Body Composition")
    st.info("Set your target values above to see the analysis table with your target measurements.")

# Now show the detailed Body Composition Analysis Table based on current selections
st.markdown("---")
st.subheader("Body Composition Analysis")

# Create dataframe with current values - removed FMI and FFMI from display as requested
comp_data = {
    'Measurement': [
        'Weight', 
        'Fat Mass', 
        'Fat-Free Mass', 
        'Body Fat %'
    ],
    'Current': [
        f"{current_weight_lbs:.1f} lbs", 
        f"{current_fat_mass_lbs:.1f} lbs", 
        f"{current_fat_free_mass_lbs:.1f} lbs", 
        f"{current_bf:.1f}%"
    ]
}

# Add target values to the dataframe only if targets have been set - simplified to remove FMI/FFMI
if st.session_state.targets_set:
    # We still calculate these values for internal use, but don't display them
    target_normalized_ffmi = target_ffmi * (1.8 / height_m)
    
    comp_data['Target'] = [
        f"{target_weight_lbs:.1f} lbs", 
        f"{target_fat_mass_lbs:.1f} lbs", 
        f"{target_ffm_lbs:.1f} lbs", 
        f"{target_bf:.1f}%"
    ]
    
    # Calculate changes for the displayed metrics
    weight_change = target_weight_lbs - current_weight_lbs
    fat_change = target_fat_mass_lbs - current_fat_mass_lbs
    ffm_change = target_ffm_lbs - current_fat_free_mass_lbs
    bf_change = target_bf - current_bf
    
    # Add change values to the dataframe (for displayed metrics only)
    comp_data['Change'] = [
        f"{weight_change:.1f} lbs",
        f"{fat_change:.1f} lbs",
        f"{ffm_change:.1f} lbs",
        f"{bf_change:.1f}%"
    ]
else:
    # Display message to set targets
    st.info("Set your target values above to see the comparison with your current measurements here.")

# Create and display the dataframe
comp_df = pd.DataFrame(comp_data)
st.dataframe(comp_df, use_container_width=True)

# SECTION 5: Timeline and Rate Settings
st.markdown("---")
# Add an HTML anchor for the button to scroll to
st.markdown('<div id="timeline_section"></div>', unsafe_allow_html=True)
st.write("### Timeline and Rate Settings")
st.write("Set the timeline and target rate for your body composition changes:")

col1, col2 = st.columns(2)

# Initialize default values for timeline variables
timeline_weeks = 12
start_date = datetime.now().date()
weekly_weight_pct = 0.005
weekly_fat_pct = 0.85 if goal_type == "Lose fat" else 0.25

with col1:
    # Only show timeline settings if targets are set
    if st.session_state.targets_set:
        # Calculate current body weight and fat percentage
        current_weight_kg = current_weight_lbs / 2.20462
        
        # Get recommended rates based on utilities
        if goal_type == "Lose fat":
            recommendation_data = utils.calculate_recommended_rate(
                {
                    "fmi_category": current_fmi_category,
                    "ffmi_category": current_ffmi_category,
                    "performance_preference": st.session_state.get("performance_preference", "Balanced"),
                    "body_comp_tradeoff": st.session_state.get("body_comp_tradeoff", "Balanced"),
                    "activity_level": activity_level,
                    "workout_frequency": st.session_state.get("workout_frequency", 3),
                    "commitment_level": st.session_state.get("commitment_level", "Medium")
                },
                "Fat Loss"
            )
            
            # Get recommended values
            rec_weekly_pct = recommendation_data.get("weekly_rate", 0.005)
            rec_fat_pct = recommendation_data.get("fat_pct", 0.85)
            
            # Recommended text
            recommended_text = f"The recommended rate for your goal is approximately {rec_weekly_pct*100:.2f}% of body weight per week, with about {rec_fat_pct*100:.0f}% of that loss coming from fat."
        
        elif goal_type == "Build muscle":
            recommendation_data = utils.calculate_recommended_rate(
                {
                    "fmi_category": current_fmi_category,
                    "ffmi_category": current_ffmi_category,
                    "performance_preference": st.session_state.get("performance_preference", "Balanced"),
                    "body_comp_tradeoff": st.session_state.get("body_comp_tradeoff", "Balanced"),
                    "activity_level": activity_level,
                    "workout_frequency": st.session_state.get("workout_frequency", 3),
                    "commitment_level": st.session_state.get("commitment_level", "Medium")
                },
                "Muscle Gain"
            )
            
            # Get recommended values
            rec_weekly_pct = recommendation_data.get("weekly_rate", 0.002)
            rec_fat_pct = recommendation_data.get("fat_pct", 0.25)
            
            # Recommended text
            recommended_text = f"The recommended rate for your goal is approximately {rec_weekly_pct*100:.2f}% of body weight per week, with about {rec_fat_pct*100:.0f}% of that gain coming from fat."
        
        else:  # Maintenance
            rec_weekly_pct = 0.0
            rec_fat_pct = 0.5
            recommended_text = "For maintenance, focus on keeping weight stable while potentially improving body composition slowly over time."
        
        st.write(f"**Recommendation**: {recommended_text}")
        
        # Simplified rate selection with predefined options
        st.write("### Set the timeline and rate for your body composition changes:")
        
        if goal_type == "Lose fat":
            # Predefined rates for fat loss
            rate_options = {
                "Gradual (0.25% per week)": 0.0025,
                "Moderate (0.5% per week)": 0.005,
                "Aggressive (0.75% per week)": 0.0075,
                "Very Aggressive (1.0% per week)": 0.01
            }
            
            # Simplify rate selection
            selected_rate = st.radio(
                "Select weekly rate of target change:",
                options=list(rate_options.keys()),
                index=1,  # Default to Moderate
                help="How quickly you want to lose fat. More aggressive rates may be harder to sustain."
            )
            
            weekly_weight_pct = -1 * rate_options[selected_rate]  # Negative for fat loss
            
            # Calculate and display the energy deficit this will create
            weekly_lbs_loss = abs(weekly_weight_pct * current_weight_lbs)
            daily_calorie_deficit = round((weekly_lbs_loss * 3500) / 7)  # 3500 calories per pound, divided by 7 days
            
            st.write(f"This rate will create a daily deficit of approximately **{daily_calorie_deficit} calories**.")
            st.write(f"Your TDEE is **{tdee} calories**, so your daily target would be approximately **{tdee - daily_calorie_deficit} calories**.")
            
            # Add a button to confirm this rate selection
            if st.button("Set Target Change Rate", key="set_fat_loss_rate"):
                # Save the selected weekly rate to session state
                st.session_state.selected_weekly_weight_pct = weekly_weight_pct
                # For fat loss, we use the pre-calculated rec_fat_pct (default 85% fat mass loss)
                st.session_state.selected_weekly_fat_pct = rec_fat_pct
                st.session_state.rate_set = True
                
                # Save to goal_info for persistence
                if "goal_info" not in st.session_state:
                    st.session_state.goal_info = {}
                
                st.session_state.goal_info["weekly_weight_pct"] = weekly_weight_pct
                st.session_state.goal_info["weekly_fat_pct"] = rec_fat_pct
                
                # Save data to ensure it persists
                utils.save_data()
                
                # Success message
                st.success("Target change rate has been set! The projected weekly progress table will now be generated.")
                st.rerun()
            
        elif goal_type == "Build muscle":
            # Predefined rates for muscle gain
            rate_options = {
                "Gradual (0.12% per week)": 0.00125,
                "Moderate (0.25% per week)": 0.0025,
                "Aggressive (0.5% per week)": 0.005,
                "Very Aggressive (0.75% per week)": 0.0075
            }
            
            # Simplify rate selection
            selected_rate = st.radio(
                "Select weekly rate of target change:",
                options=list(rate_options.keys()),
                index=1,  # Default to Moderate
                help="How quickly you want to gain muscle. More aggressive rates may include more fat gain."
            )
            
            weekly_weight_pct = rate_options[selected_rate]  # Positive for muscle gain
            
            # Calculate and display the energy surplus this will create
            weekly_lbs_gain = weekly_weight_pct * current_weight_lbs
            daily_calorie_surplus = round((weekly_lbs_gain * 3500) / 7)  # 3500 calories per pound, divided by 7 days
            
            st.write(f"This rate will create a daily surplus of approximately **{daily_calorie_surplus} calories**.")
            st.write(f"Your TDEE is **{tdee} calories**, so your daily target would be approximately **{tdee + daily_calorie_surplus} calories**.")
            
            # Add a button to confirm this rate selection
            if st.button("Set Target Change Rate", key="set_muscle_gain_rate"):
                # Save the selected weekly rate to session state
                st.session_state.selected_weekly_weight_pct = weekly_weight_pct
                # For muscle gain, we use the pre-calculated rec_fat_pct (default 25% fat mass gain)
                st.session_state.selected_weekly_fat_pct = rec_fat_pct
                st.session_state.rate_set = True
                
                # Save to goal_info for persistence
                if "goal_info" not in st.session_state:
                    st.session_state.goal_info = {}
                
                st.session_state.goal_info["weekly_weight_pct"] = weekly_weight_pct
                st.session_state.goal_info["weekly_fat_pct"] = rec_fat_pct
                
                # Save data to ensure it persists
                utils.save_data()
                
                # Success message
                st.success("Target change rate has been set! The projected weekly progress table will now be generated.")
                st.rerun()
            
        else:  # Maintenance
            # For maintenance, offer body recomposition options
            rate_options = {
                "Pure maintenance (0% per week)": 0.0,
                "Slight deficit (0.1% per week)": -0.001,
                "Slight surplus (0.1% per week)": 0.001
            }
            
            selected_rate = st.radio(
                "Select maintenance approach:",
                options=list(rate_options.keys()),
                index=0,
                help="For maintenance, you can either maintain exact weight or create a very small deficit/surplus."
            )
            
            weekly_weight_pct = rate_options[selected_rate]
            
            # Add a button to confirm this rate selection for maintenance
            if st.button("Set Target Change Rate", key="set_maintenance_rate"):
                # Save the selected weekly rate to session state
                st.session_state.selected_weekly_weight_pct = weekly_weight_pct
                st.session_state.selected_weekly_fat_pct = 0.5  # 50/50 for maintenance
                st.session_state.rate_set = True
                
                # Save to goal_info for persistence
                if "goal_info" not in st.session_state:
                    st.session_state.goal_info = {}
                
                st.session_state.goal_info["weekly_weight_pct"] = weekly_weight_pct
                st.session_state.goal_info["weekly_fat_pct"] = 0.5
                
                # Save data to ensure it persists
                utils.save_data()
                
                # Success message
                st.success("Target change rate has been set! The projected weekly progress table will now be generated.")
                st.rerun()
        
        # Display the weekly change in absolute terms
        weekly_weight_change_lbs = weekly_weight_pct * current_weight_lbs
        weekly_weight_change_kg = weekly_weight_pct * current_weight_kg
        
        # Show rate in pounds/kg format with proper direction
        if abs(weekly_weight_pct) < 0.0001:
            st.write("This equals approximately no change in weight per week (maintenance).")
        else:
            change_direction = "gain" if weekly_weight_change_lbs > 0 else "loss"
            st.write(f"This equals approximately {abs(weekly_weight_change_lbs):.2f} lbs ({abs(weekly_weight_change_kg):.2f} kg) {change_direction} per week.")
        
        # Use the recommended fat percentage instead of a slider
        # since targets have already been set in a previous step
        if goal_type == "Lose fat":
            weekly_fat_pct = float(rec_fat_pct)  # Default to 85% for fat loss
            st.info(f"Based on your targets, approximately {weekly_fat_pct*100:.0f}% of your weekly weight change will be fat tissue, with the rest being lean tissue.")
        elif goal_type == "Build muscle":
            weekly_fat_pct = float(rec_fat_pct)  # Default to 25% for muscle gain
            st.info(f"Based on your targets, approximately {weekly_fat_pct*100:.0f}% of your weekly weight gain will be fat tissue, with {(1-weekly_fat_pct)*100:.0f}% being muscle.")
        else:  # Maintenance
            weekly_fat_pct = 0.5  # Default 50/50 for maintenance
            st.info("For maintenance, we assume equal changes in fat and muscle tissue for small body composition adjustments.")
            
    else:
        st.info("Set your target values above to configure your timeline and rate settings.")

with col2:
    # Only show timeline settings if targets are set
    if st.session_state.targets_set:
        # Handle different goal types for timeline calculation
        if goal_type == "Maintain body composition/Support performance":
            # For maintenance, suggest a standard timeline
            timeline_weeks = 12
            st.write("#### Timeline for Maintenance")
            st.write("For body composition maintenance, we recommend a standard 12-week timeline for consistent tracking.")
        else:
            # Calculate timeline based on target body composition
            try:
                goal_type_code = "lose_fat" if goal_type == "Lose fat" else "gain_muscle"
                # Use absolute value of weekly_weight_pct for calculation
                actual_rate = abs(weekly_weight_pct)
                
                # Only calculate if there's a meaningful rate
                if actual_rate > 0.0001:
                    timeline_weeks = utils.calculate_predicted_weeks(
                        current_weight_lbs / 2.20462,  # Current weight in kg
                        target_weight_lbs / 2.20462,   # Target weight in kg
                        current_bf,                   # Current body fat percentage
                        target_bf,                    # Target body fat percentage
                        actual_rate,                  # Weekly weight change percentage (absolute)
                        weekly_fat_pct,               # Percentage of weight change that is fat
                        goal_type_code
                    )
                else:
                    # Default for minimal change
                    timeline_weeks = 12
                
                # Provide warnings for extreme timelines
                if timeline_weeks < 4:
                    st.warning("The calculated timeline is very short. Consider a more moderate rate for sustainable results.")
                elif timeline_weeks > 52:
                    st.warning("The calculated timeline exceeds 1 year. Consider adjusting your goals or rates for a more achievable timeline.")
            except Exception as e:
                st.error(f"Error calculating timeline: {str(e)}")
                timeline_weeks = 12  # Default fallback
        
        # Display the calculated timeline without additional options
        if timeline_weeks > 0:
            st.success(f"Estimated time to reach your target: **{timeline_weeks:.1f} weeks** (approximately {timeline_weeks/4:.1f} months)")
            
            # Allow user to select start date
            start_date = st.date_input(
                "Start Date:",
                value=datetime.now().date(),
                help="When do you want to start your plan? This will be Week 0 in your progress table."
            )
            
            # Calculate end date based on selected start date
            end_date = start_date + timedelta(days=int(timeline_weeks * 7))
            st.write(f"Estimated completion date: **{end_date.strftime('%B %d, %Y')}**")
        else:
            st.warning("The targets you've set do not represent a significant change. Consider adjusting your targets or selecting 'Maintain' as your goal type.")
            timeline_weeks = 12  # Default to 12 weeks for maintenance or when calculation gives invalid result
    else:
        st.info("Set your target values above to calculate your timeline.")
        timeline_weeks = 12  # Default value that won't be used

# SECTION 6: Weekly Progress Table
st.markdown("---")
st.subheader("Projected Weekly Progress")

# Initialize progress_df with empty DataFrame
progress_df = pd.DataFrame()

# Only show progress table if targets are set
if st.session_state.targets_set and timeline_weeks > 0:
    # Generate detailed progress table with the selected start date
    progress_df = utils.generate_detailed_progress_table(
        current_weight_lbs,
        current_bf,
        target_weight_lbs,
        target_bf,
        weekly_weight_pct,
        weekly_fat_pct,
        timeline_weeks,
        start_date.strftime('%Y-%m-%d'),
        tdee,
        gender,
        age,
        height_cm
    )
    
    # Display the table
    st.dataframe(progress_df)
else:
    st.info("Set your target values above to generate your projected weekly progress table.")

# Save button
with st.form(key="save_goal_form"):
    st.write("### Save Your Body Composition Goals")
    st.write("Click the button below to save your current goals and timeline:")
    
    save_button = st.form_submit_button(label="Save Goals")
    
    if save_button:
        # Only save if targets have been set
        if st.session_state.targets_set:
            # Save the targets and rates to session state for access by other pages
            st.session_state.target_weight_lbs = target_weight_lbs if st.session_state.targets_set else current_weight_lbs
            st.session_state.target_bf_pct = target_bf if st.session_state.targets_set else current_bf
            st.session_state.target_fat_mass_lbs = target_fat_mass_lbs if st.session_state.targets_set else current_fat_mass_lbs
            st.session_state.target_ffm_lbs = target_ffm_lbs if st.session_state.targets_set else current_fat_free_mass_lbs
            st.session_state.weekly_weight_pct = weekly_weight_pct
            st.session_state.weekly_fat_pct = weekly_fat_pct
            st.session_state.timeline_weeks = timeline_weeks
            st.session_state.start_date = start_date.strftime('%Y-%m-%d')
            
            # Create or update goal_info dictionary
            if 'goal_info' not in st.session_state:
                st.session_state.goal_info = {}
            
            # Always update goal_info with basic targets
            st.session_state.goal_info.update({
                'goal_type': goal_type,
                'target_weight_lbs': target_weight_lbs,
                'target_body_fat': target_bf,
                'target_fat_mass_lbs': target_fat_mass_lbs,
                'target_ffm_lbs': target_ffm_lbs,
                'timeline_weeks': timeline_weeks,
                'start_date': start_date.strftime('%Y-%m-%d')
            })
            
            # Get target energy from Week 0 of progress table if available
            if 'progress_df' in locals() and not progress_df.empty:
                week0_data = progress_df[progress_df['Week'] == 0]
                if not week0_data.empty and 'Daily Energy Target (kcal)' in week0_data.columns:
                    # Use .values to get numpy array then index it
                    target_energy = int(week0_data['Daily Energy Target (kcal)'].values[0])
                    st.session_state.goal_info['target_energy'] = target_energy
            
            # Save to data file
            utils.save_data()
            
            st.success("Goals saved successfully!")
        else:
            st.warning("Please set your target values before saving.")

st.markdown("---")
st.write("Continue to the Diet Preferences page to set up your food preferences and meal sourcing options.")
if st.session_state.targets_set:
    st.link_button("Continue to Diet Preferences", url="Diet_Preferences")

# Show progressive summary
show_progress_summary('body_comp')