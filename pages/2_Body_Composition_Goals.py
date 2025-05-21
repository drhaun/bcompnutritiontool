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

# Initialize session state variables
if "targets_set" not in st.session_state:
    st.session_state.targets_set = False

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

# Header
st.image("images/branding/fitomics_horizontal_gold.png", width=300)
st.title("Body Composition Goals")
st.markdown("Define your body composition targets and timeline.")

# Check if initial setup is complete, otherwise redirect
# Temporarily bypassed for testing
if False and ("setup_complete" not in st.session_state or not st.session_state.setup_complete):
    st.error("Please complete the Initial Setup first.")
    st.link_button("Go to Initial Setup", url="Initial_Setup")
    st.stop()

# Initialize session state variables for testing if needed
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

# Load saved data if available
gender = st.session_state.gender
age = st.session_state.age
height_cm = st.session_state.height_cm
weight_kg = st.session_state.weight_kg
weight_lbs = weight_kg * 2.20462
body_fat_pct = st.session_state.body_fat_pct
goal_type = st.session_state.goal_type
activity_level = st.session_state.activity_level
tdee = st.session_state.tdee

# SECTION 1: Current Body Composition Summary
st.write("### Current Body Composition")

# Calculate current body composition values
current_weight_lbs = weight_lbs
current_bf = body_fat_pct
current_fat_mass_lbs = current_weight_lbs * (current_bf / 100)
current_fat_free_mass_lbs = current_weight_lbs - current_fat_mass_lbs

# Calculate FMI and FFMI
height_m = height_cm / 100
current_fat_mass_kg = current_fat_mass_lbs / 2.20462
current_ffm_kg = current_fat_free_mass_lbs / 2.20462
current_fmi = current_fat_mass_kg / (height_m * height_m)
current_ffmi = current_ffm_kg / (height_m * height_m)
current_normalized_ffmi = current_ffmi * (1.8 / height_m)

# Display current body composition
st.success(f"""
- **Current Weight**: {current_weight_lbs:.1f} lbs
- **Current Body Fat**: {current_bf:.1f}%
- **Current Fat Mass**: {current_fat_mass_lbs:.1f} lbs
- **Current Fat-Free Mass**: {current_fat_free_mass_lbs:.1f} lbs
- **Current FMI**: {current_fmi:.1f} kg/m²
- **Current FFMI**: {current_ffmi:.1f} kg/m²
- **Current Normalized FFMI**: {current_normalized_ffmi:.1f} kg/m²
""")

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

# Display as dataframe
comp_df = pd.DataFrame(comp_data)
st.dataframe(comp_df, use_container_width=True)

# Display category information
st.write("#### Body Composition Categories")
col1, col2 = st.columns(2)

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

with col1:
    st.write(f"**Current FMI Category**: {current_fmi_category}")
    st.write(f"**Current FFMI Category**: {current_ffmi_category}")

with col2:
    st.write("**Target FMI Category**: Set target values first")
    st.write("**Target FFMI Category**: Set target values first")

# Get combined recommendations for current values
current_combo_rec = utils.get_combined_category_rates(current_fmi_category, current_ffmi_category)
current_recommended_category = current_combo_rec.get("recommendation", "No specific recommendation available")

st.write("#### Recommendations")
st.write(f"**Based on current body composition**: {current_recommended_category}")
st.write("**Based on target body composition**: Set target values first")

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
    
    # Fat-Free Mass Index explanation
    st.write("### Fat-Free Mass Index (FFMI)")
    st.write("""
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
    
    # Body Composition Category Reference Tables
    st.write("### Body Composition Category Reference Tables")
    
    # Add advice based on combined categories
    with st.expander("View Body Composition Category Combinations and Recommendations"):
        st.write("""
        The combination of your FMI and FFMI categories provides a comprehensive picture of your body composition status.
        
        **General Patterns:**
        - If your FMI is high and FFMI is low: Focus on losing fat while gaining muscle
        - If your FMI is high and FFMI is average: Focus on losing fat while maintaining muscle
        - If your FMI is low or average and FFMI is low: Focus on building muscle
        - If your FMI is low and FFMI is high: Consider maintenance or a slight surplus for performance
        - If your FMI is high and FFMI is high: Consider body recomposition (lose fat while maintaining muscle)
        
        The "Body Composition Category Reference Tables" provide specific recommendations based on your unique combination.
        """)

# Initialize target session state variables if needed
if "target_bf" not in st.session_state:
    # Initialize with placeholder values (current values)
    st.session_state.target_bf = current_bf
    st.session_state.target_fat = current_fat_mass_lbs
    st.session_state.target_ffm = current_fat_free_mass_lbs
    st.session_state.target_fmi = current_fmi
    st.session_state.target_ffmi = current_ffmi

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
        
        # Set flag that target values have been set
        st.session_state.targets_set = True
    except Exception as e:
        st.error(f"Error updating values: {e}")

# Add explanation about target body fat changes
st.write("""
#### How Target Body Fat % Works
When you adjust target body fat %, the total body weight stays the same but the composition changes - 
more or less of your weight becomes fat vs. muscle. This matches how many body composition changes occur in real life.
If you want to change your total weight, adjust the Fat Mass and Fat-Free Mass directly.
""")

# Target Body Fat % Method
if target_method == "Target Body Fat %":
    st.write("Use the slider to adjust your target body fat percentage:")
    try:
        # Get current target body fat from session state
        current_target_bf = float(st.session_state.target_bf)
        
        # Get min/max values based on gender
        min_bf = 5 if gender == "Male" else 12
        max_bf = 35
        
        # Adjust based on goal type
        if goal_type == "Lose fat":
            max_bf = min(max_bf, current_bf - 1)
        elif goal_type == "Gain muscle":
            min_bf = max(min_bf, current_bf - 5)
            max_bf = min(max_bf, current_bf + 2)
        
        # Ensure current target is within limits
        if current_target_bf < min_bf:
            current_target_bf = min_bf
        if current_target_bf > max_bf:
            current_target_bf = max_bf
            
        # Target body fat slider
        new_target_bf = st.slider(
            "Target Body Fat %",
            min_value=float(min_bf),
            max_value=float(max_bf),
            value=float(current_target_bf),
            step=0.5,
            help="Set your target body fat percentage"
        )
        
        # Update values if slider changed
        if new_target_bf != current_target_bf:
            update_from_bf(new_target_bf)
            st.success(f"Target body fat set to {new_target_bf:.1f}%")
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
                elif goal_type == "Gain muscle":
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
        
        with comp_col2:
            st.write("#### Resulting Values")
            
            # Calculate resulting weight and body fat percentage
            resulting_weight = new_target_fat_mass_lbs + new_target_ffm_lbs
            st.write(f"Resulting Weight: **{resulting_weight:.1f} lbs**")
            
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
                st.session_state.targets_set = True
                st.success("Target weight components updated successfully!")
                # Use st.rerun() which is the current recommended way
                try:
                    st.rerun()
                except:
                    st.warning("Please refresh the page to see updated values.")
    except Exception as e:
        st.error(f"Error in Target Weight Components section: {e}")

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
    target_normalized_ffmi = target_ffmi * (1.8 / height_m)

    # Display the calculated values
    st.write("### Target Body Composition Summary")
    st.success(f"""
    - **Target Weight**: {target_weight_lbs:.1f} lbs ({(target_weight_lbs-current_weight_lbs):.1f} lbs change)
    - **Target Body Fat**: {target_bf:.1f}% ({(target_bf-current_bf):.1f}% change)
    - **Target Fat Mass**: {target_fat_mass_lbs:.1f} lbs ({(target_fat_mass_lbs-current_fat_mass_lbs):.1f} lbs change)
    - **Target Fat-Free Mass**: {target_ffm_lbs:.1f} lbs ({(target_ffm_lbs-current_fat_free_mass_lbs):.1f} lbs change)
    """)
else:
    st.write("### Target Body Composition Summary")
    st.info("Set your target values above to see your target body composition summary.")

# Now show the detailed Body Composition Analysis Table based on current selections
st.markdown("---")
st.subheader("Body Composition Analysis")

# Create dataframe with current values
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

# Add target values to the dataframe only if targets have been set
if st.session_state.targets_set:
    target_normalized_ffmi = target_ffmi * (1.8 / height_m)
    
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
else:
    # Display message to set targets
    st.info("Set your target values above to see the comparison with your current measurements here.")

# Create and display the dataframe
comp_df = pd.DataFrame(comp_data)
st.dataframe(comp_df, use_container_width=True)

# SECTION 5: Timeline and Rate Settings
st.markdown("---")
st.write("### Timeline and Rate Settings")
st.write("Set the timeline and target rate for your body composition changes:")

col1, col2 = st.columns(2)

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
        
        elif goal_type == "Gain muscle":
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
        
        # Weekly percentage rate slider with recommended value
        weekly_weight_pct = st.slider(
            "Weekly rate (% of body weight)",
            min_value=0.0,
            max_value=max(1.0, rec_weekly_pct * 2),  # Allow up to double the recommended rate
            value=float(rec_weekly_pct),
            step=0.001,
            format="%.3f",
            help="Set the weekly rate of change as a percentage of current body weight"
        )
        
        # Display the weekly change in absolute terms
        weekly_weight_change_lbs = weekly_weight_pct * current_weight_lbs
        weekly_weight_change_kg = weekly_weight_pct * current_weight_kg
        
        if goal_type != "Maintain":
            st.write(f"This equals approximately {weekly_weight_change_lbs:.1f} lbs ({weekly_weight_change_kg:.1f} kg) per week.")
        
        # Fat percentage slider
        if goal_type != "Maintain":
            # Use recommended value as default
            weekly_fat_pct = st.slider(
                "Percentage as fat tissue",
                min_value=0.0,
                max_value=1.0,
                value=float(rec_fat_pct),
                step=0.05,
                format="%d%%",
                help="What percentage of the weight change will be fat tissue"
            )
        else:
            weekly_fat_pct = 0.5  # Default for maintenance
            
    else:
        st.info("Set your target values above to configure your timeline and rate settings.")
        # Set default values that won't be used
        weekly_weight_pct = 0.005
        weekly_fat_pct = 0.85 if goal_type == "Lose fat" else 0.25

with col2:
    # Only show timeline settings if targets are set
    if st.session_state.targets_set:
        # Calculate timeline
        timeline_weeks = utils.calculate_predicted_weeks(
            current_weight_lbs / 2.20462,  # Current weight in kg
            target_weight_lbs / 2.20462,   # Target weight in kg
            current_bf,                   # Current body fat percentage
            target_bf,                    # Target body fat percentage
            weekly_weight_pct,            # Weekly weight change percentage
            weekly_fat_pct,               # Percentage of weight change that is fat
            "lose_fat" if goal_type == "Lose fat" else "gain_muscle"
        )
        
        # Display the calculated timeline
        if timeline_weeks > 0:
            st.success(f"Estimated time to reach your target: **{timeline_weeks:.1f} weeks** (approximately {timeline_weeks/4:.1f} months)")
            
            # Option to adjust timeline
            st.write("Or set your desired timeline:")
            desired_weeks = st.slider(
                "Timeline (weeks)",
                min_value=int(max(1, timeline_weeks / 2)),  # Allow timeline to be cut in half as minimum
                max_value=int(timeline_weeks * 2),  # Allow timeline to be doubled as maximum
                value=int(timeline_weeks),
                step=1,
                help="Set your desired timeline in weeks"
            )
            
            # Recalculate required rate based on desired timeline
            if desired_weeks != timeline_weeks:
                # This is a simplification; a more accurate calculation would require solving for weekly_weight_pct
                required_rate = weekly_weight_pct * (timeline_weeks / desired_weeks)
                st.write(f"To reach your target in {desired_weeks} weeks, you would need a weekly rate of approximately {required_rate*100:.3f}% of body weight.")
                
                # Update the timeline_weeks for the progress table
                timeline_weeks = desired_weeks
        else:
            st.warning("The targets you've set do not represent a significant change. Consider adjusting your targets or selecting 'Maintain' as your goal type.")
            timeline_weeks = 12  # Default to 12 weeks for maintenance or when calculation gives invalid result
    else:
        st.info("Set your target values above to calculate your timeline.")
        timeline_weeks = 12  # Default value that won't be used

# SECTION 6: Weekly Progress Table
st.markdown("---")
st.subheader("Projected Weekly Progress")

# Only show progress table if targets are set
if st.session_state.targets_set and timeline_weeks > 0:
    # Generate detailed progress table
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
            
            # Save to data file
            utils.save_data()
            
            st.success("Goals saved successfully!")
        else:
            st.warning("Please set your target values before saving.")

st.markdown("---")
st.write("Continue to the Nutrition Plan page to set up your nutrition targets based on these goals.")
if st.session_state.targets_set:
    st.link_button("Continue to Nutrition Plan", url="Nutrition_Plan")