import streamlit as st
import pandas as pd
import numpy as np
from datetime import datetime
import sys
import os

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
    
    col1, col2 = st.columns(2)
    
    with col1:
        gender = st.radio(
            "Gender",
            options=["Male", "Female"],
            index=0 if st.session_state.user_info.get('gender') == "Male" else 1 if st.session_state.user_info.get('gender') == "Female" else 0
        )
        
        age = st.number_input(
            "Age (years)",
            min_value=18,
            max_value=100,
            value=st.session_state.user_info.get('age', 30),
            step=1
        )
        
        height_cm = st.number_input(
            "Height (cm)",
            min_value=120,
            max_value=250,
            value=st.session_state.user_info.get('height_cm', 170),
            step=1
        )
    
    with col2:
        weight_kg = st.number_input(
            "Current Weight (kg)",
            min_value=30.0,
            max_value=300.0,
            value=st.session_state.user_info.get('weight_kg', 70.0),
            step=0.1,
            format="%.1f"
        )
        
        body_fat = st.number_input(
            "Body Fat Percentage (%) - if known, estimate otherwise",
            min_value=3.0,
            max_value=50.0,
            value=st.session_state.user_info.get('body_fat_percentage', 15.0),
            step=0.1,
            format="%.1f"
        )
        
        activity_level = st.selectbox(
            "Activity Level",
            options=[
                "Sedentary (office job, <2 hours exercise per week)",
                "Lightly Active (light exercise 2-3 times per week)",
                "Moderately Active (moderate exercise 3-5 times per week)",
                "Very Active (hard exercise 6-7 times per week)",
                "Extremely Active (very hard exercise, physical job or training twice a day)"
            ],
            index=2 if st.session_state.user_info.get('activity_level') is None else [
                "Sedentary (office job, <2 hours exercise per week)",
                "Lightly Active (light exercise 2-3 times per week)",
                "Moderately Active (moderate exercise 3-5 times per week)",
                "Very Active (hard exercise 6-7 times per week)",
                "Extremely Active (very hard exercise, physical job or training twice a day)"
            ].index(st.session_state.user_info.get('activity_level'))
        )
    
    submit_button = st.form_submit_button("Save and Continue")
    
    if submit_button:
        # Update session state
        st.session_state.user_info = {
            'gender': gender,
            'age': age,
            'height_cm': height_cm,
            'weight_kg': weight_kg,
            'body_fat_percentage': body_fat,
            'activity_level': activity_level
        }
        
        # Save data
        utils.save_data()
        
        st.success("Personal information saved! Please proceed to 'Body Composition Goals'.")
        
        # Calculate some stats for user information
        tdee = utils.calculate_tdee(gender, weight_kg, height_cm, age, activity_level)
        bmr = utils.calculate_bmr(gender, weight_kg, height_cm, age)
        
        st.info(f"""
        Based on your information:
        - Basal Metabolic Rate (BMR): {bmr:.0f} calories/day
        - Total Daily Energy Expenditure (TDEE): {tdee:.0f} calories/day
        
        These are the calories you need to maintain your current weight. We'll use this information to customize your plan based on your goals.
        """)

# Show navigation hint
st.markdown("---")
st.markdown("👈 Use the sidebar to navigate between pages")
st.markdown("👉 Next step: [Body Composition Goals](/Body_Composition_Goals)")
