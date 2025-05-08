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
    current_weight = st.session_state.user_info['weight_kg']
    current_bf = st.session_state.user_info['body_fat_percentage']
    
    st.info(f"Current Weight: {current_weight} kg | Current Body Fat: {current_bf}%")
    
    col1, col2 = st.columns(2)
    
    with col1:
        goal_type = st.radio(
            "What is your primary goal?",
            options=["Lose fat", "Gain muscle", "Maintain current composition"],
            index=0 if st.session_state.goal_info.get('goal_type') == "lose_fat" else 
                  1 if st.session_state.goal_info.get('goal_type') == "gain_muscle" else
                  2 if st.session_state.goal_info.get('goal_type') == "maintain" else 0
        )
        
        # Convert the display name to the internal code
        goal_type_code = "lose_fat" if goal_type == "Lose fat" else "gain_muscle" if goal_type == "Gain muscle" else "maintain"
        
        target_weight = st.number_input(
            "Target Weight (kg)",
            min_value=30.0,
            max_value=300.0,
            value=st.session_state.goal_info.get('target_weight_kg', current_weight * 0.9 if goal_type == "Lose fat" else current_weight * 1.1 if goal_type == "Gain muscle" else current_weight),
            step=0.1,
            format="%.1f"
        )
    
    with col2:
        target_bf = st.number_input(
            "Target Body Fat (%)",
            min_value=3.0,
            max_value=50.0,
            value=st.session_state.goal_info.get('target_body_fat', current_bf * 0.8 if goal_type == "Lose fat" else max(current_bf * 0.9, 8.0) if goal_type == "Gain muscle" else current_bf),
            step=0.1,
            format="%.1f"
        )
        
        timeline_weeks = st.number_input(
            "Timeline (weeks)",
            min_value=4,
            max_value=52,
            value=st.session_state.goal_info.get('timeline_weeks', 12),
            step=1
        )
        
        start_date = st.date_input(
            "Start Date",
            value=datetime.strptime(st.session_state.goal_info.get('start_date', datetime.now().strftime('%Y-%m-%d')), '%Y-%m-%d').date() if st.session_state.goal_info.get('start_date') else datetime.now().date()
        )
    
    submit_button = st.form_submit_button("Save and Continue")
    
    if submit_button:
        # Calculate expected weekly change
        weight_change = target_weight - current_weight
        weekly_change = weight_change / timeline_weeks
        weekly_bf_change = (target_bf - current_bf) / timeline_weeks
        
        # Validate goal feasibility
        is_goal_feasible = True
        warning_message = ""
        
        if goal_type == "Lose fat" and weekly_change > -0.1:
            warning_message = "For fat loss, aim to lose at least 0.1 kg per week."
            is_goal_feasible = False
        elif goal_type == "Lose fat" and weekly_change < -1.0:
            warning_message = "Weight loss faster than 1 kg per week is not recommended for most people."
            is_goal_feasible = False
        elif goal_type == "Gain muscle" and weekly_change < 0.1:
            warning_message = "For muscle gain, aim to gain at least 0.1 kg per week."
            is_goal_feasible = False
        elif goal_type == "Gain muscle" and weekly_change > 0.5:
            warning_message = "Weight gain faster than 0.5 kg per week may lead to excessive fat gain."
            is_goal_feasible = False
        
        if not is_goal_feasible:
            st.warning(warning_message)
        else:
            # Update session state
            st.session_state.goal_info = {
                'goal_type': goal_type_code,
                'target_weight_kg': target_weight,
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
            - Weight Change: {weight_change:.1f} kg ({weekly_change:.2f} kg/week)
            - Body Fat Change: {target_bf - current_bf:.1f}% ({weekly_bf_change:.2f}%/week)
            - Timeline: {timeline_weeks} weeks (from {start_date} to {end_date})
            """)

# Display expected progress if goals have been set
if st.session_state.goal_info.get('target_weight_kg'):
    st.subheader("Expected Progress")
    
    # Calculate values
    current_weight = st.session_state.user_info['weight_kg']
    target_weight = st.session_state.goal_info['target_weight_kg']
    current_bf = st.session_state.user_info['body_fat_percentage']
    target_bf = st.session_state.goal_info['target_body_fat']
    timeline_weeks = st.session_state.goal_info['timeline_weeks']
    
    # Calculate weekly changes
    weekly_weight_change = (target_weight - current_weight) / timeline_weeks
    weekly_bf_change = (target_bf - current_bf) / timeline_weeks
    
    # Calculate lean body mass changes
    current_lbm = current_weight * (1 - current_bf/100)
    target_lbm = target_weight * (1 - target_bf/100)
    lbm_change = target_lbm - current_lbm
    
    # Create a progress table
    weeks = list(range(0, timeline_weeks + 1, 4))  # Show every 4 weeks
    if weeks[-1] != timeline_weeks:  # Make sure the final week is included
        weeks.append(timeline_weeks)
    
    progress_data = []
    
    for week in weeks:
        expected_weight = current_weight + (weekly_weight_change * week)
        expected_bf = current_bf + (weekly_bf_change * week)
        expected_lbm = expected_weight * (1 - expected_bf/100)
        expected_fat_mass = expected_weight * (expected_bf/100)
        
        progress_data.append({
            'Week': week,
            'Weight (kg)': f"{expected_weight:.1f}",
            'Body Fat (%)': f"{expected_bf:.1f}",
            'Lean Mass (kg)': f"{expected_lbm:.1f}",
            'Fat Mass (kg)': f"{expected_fat_mass:.1f}"
        })
    
    progress_df = pd.DataFrame(progress_data)
    st.table(progress_df)
    
    # Display some insights about the goal
    st.subheader("Goal Insights")
    
    if lbm_change > 0:
        st.success(f"Your plan aims to build approximately {lbm_change:.1f} kg of lean body mass.")
    elif lbm_change < 0:
        st.warning(f"Your plan will result in approximately {abs(lbm_change):.1f} kg loss of lean body mass. Consider increasing protein intake and resistance training to minimize muscle loss.")
    
    fat_mass_change = (target_weight * target_bf/100) - (current_weight * current_bf/100)
    if fat_mass_change < 0:
        st.success(f"Your plan aims to lose approximately {abs(fat_mass_change):.1f} kg of fat mass.")
    elif fat_mass_change > 0:
        st.warning(f"Your plan will result in approximately {fat_mass_change:.1f} kg gain of fat mass. If this is not intended, consider adjusting your goals.")

# Show navigation hint
st.markdown("---")
st.markdown("👈 Use the sidebar to navigate between pages")
st.markdown("👉 Next step: [Nutrition Plan](/Nutrition_Plan)")
